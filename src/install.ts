import * as child_process from 'child_process'
import { arg } from 'decarg'
import { constants } from 'fs'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import * as semver from 'semver'
import * as util from 'util'

const readable = async (pathname: string) => {
  try {
    await fs.access(pathname, constants.R_OK)
    return true
  } catch (error) {
    return false
  }
}

const exec = (cmd: string, args: string[] = [], options: child_process.SpawnOptions = {}) =>
  new Promise(resolve => {
    const child = child_process.spawn(
      cmd,
      args,
      {
        stdio: 'inherit',
        killSignal: 'SIGINT',
        ...options,
      }
    )
    const kill = (signal: NodeJS.Signals) => {
      child.kill(signal)
      process.exit(1)
    }
    process.on('SIGINT', () => kill('SIGINT'))
    child.on('exit', resolve)
  })

export class InstallOptions {
  @arg('--bin', 'npm binary')
  bin = 'safe-npm'

  @arg('--root', 'Project directory with a package.json to install depndencies in')
  root = '.'

  @arg('--peer', 'Install peer dependencies only')
  peer?: boolean = false

  @arg('--force', 'Force (re)installation')
  force?: boolean = false

  @arg('--cache', 'Cache path')
  cache = path.join(os.homedir(), '.fastpm')

  deps?: string

  constructor(options: Partial<InstallOptions> = {}) {
    Object.assign(this, options)
  }
}

export const install = async (options: InstallOptions) => {
  const root = path.resolve(options.root)
  console.log('starting installation under "%s" ...\n', root)

  // create a node_modules directory inside root
  const node_modules = path.join(root, 'node_modules')
  const binTarget = path.join(node_modules, '.bin')
  await fs.mkdir(node_modules, { recursive: true })

  // read root's package.json
  const pkg = await import(path.join(root, 'package.json'))

  // installs a package's dependencies
  const execInstall = (cwd: string) =>
    exec(
      options.bin,
      [
        'install',

        // force dependencies to have single directory structure, but flat their own
        '--global-style',

        // try to use cache first
        '--prefer-offline',
      ],
      { cwd }
    )

  // runs postinstall script on a package
  const execPostInstall = (cwd: string) =>
    exec(
      options.bin,
      ['run', 'postinstall', '--if-present'],
      { cwd }
    )

  const finish = async () => {
    // if this isn't a peer dependency install, we finalize with
    // by running `npm install` which links local dependencies and runs scripts
    if (!options.peer)
      execInstall(root)
  }

  // concurrency queue manager
  const tasks: (() => Promise<void>)[] = []
  const maxNumberOfTasks = 2
  let currentNumberOfTasks = 0
  const flush = () => {
    if (tasks.length > 0 && currentNumberOfTasks < maxNumberOfTasks) {
      currentNumberOfTasks++
      tasks.shift()!().catch(console.error).finally(() => {
        currentNumberOfTasks--
        if (!--remainingTasks)
          finish()
        else
          flush()
      })
      flush()
    }
  }

  // determine which packages we need to install
  const depTypes = options.peer ? ['peerDependencies'] : ['devDependencies', 'dependencies']

  // include peerDependenciesMeta because transitive installs
  // will not be able to see the dependencies in own project
  // so they need to use their own
  if (options.peer && pkg.peerDependenciesMeta) {
    pkg.peerDependencies ??= {}
    const deps = pkg.peerDependencies
    for (const name in pkg.peerDependenciesMeta) {
      // if the meta dependency is missing from peerDependencies
      if (!(name in deps)) {
        // use the version in its devDependencies if possible
        if (name in pkg.devDependencies)
          deps[name] = pkg.devDependencies[name]
        // as last resort, install any dependency
        else
          deps[name] = '*'
      }
    }
  }

  // returns the produced source paths given a parent package
  // that we will use to link inside this root's node_modules
  const getSourcePaths = (parent: string, name: string) => [
    path.join(parent, 'node_modules', name),
    path.join(parent, 'node_modules', '.bin'),
  ]

  // iterate kinds of dependencies
  for (const deps of depTypes) {
    // read cache packages for this type of dependencies to match versions against
    let packages: string[] = []
    try {
      packages = await fs.readdir(path.join(options.cache, deps))
    } catch {}

    for (const [name, version] of Object.entries(pkg[deps] ?? {}) as [string, string][]) {
      // if it's a file: or link: dependency, ignore it and let it be handled by the `npm install` finalize step
      if (version.startsWith('file:') || version.startsWith('link:')) {
        const target = path.join(node_modules, name)
        console.log('  local: %s < %s > ./%s', name, version, path.relative(root, target))
        continue
      }

      tasks.push(async () => {
        const distTarget = path.join(node_modules, name)

        // ignore if package is already installed and not using --force
        if (await readable(distTarget)) {
          console.log(' exists: %s@%s > ./%s', name, version, path.relative(root, distTarget))
          if (options.force)
            await fs.rm(distTarget, { recursive: true })
          else
            return
        }

        // links package dist and bin sources
        const link = async (distSource: string, binSource: string) => {
          console.log('symlink: %s@%s < %s > ./%s', name, version, distSource, path.relative(root, distTarget))

          // if it's a scoped package, create the necessary directory structure for it
          if (name.includes('/')) await fs.mkdir(path.dirname(distTarget), { recursive: true })

          // create the symlink
          await fs.symlink(distSource, distTarget, 'junction')

          // discover and symlink bins that might be produced by the installation
          try {
            const bins = await fs.readdir(binSource)

            for (const bin of bins) {
              const source = path.join(binSource, bin)
              const target = path.join(binTarget, bin)

              console.log('symlink: %s > ./%s', source, path.relative(root, target))

              await fs.mkdir(path.dirname(target), { recursive: true })
              await fs.symlink(source, target, 'junction')
            }
          } catch {}
        }

        // discover a version that matches our cached packages
        // this step is skipped when --force is used
        if (!options.force) {
          // TODO: gather all versions and match against all of them to use the latest one
          //  for now it matches the first one it satisfies our version
          for (const x of packages) {
            const [p, v] = x.split('@')
            if (p === name) {
              if (semver.satisfies(v, version, { loose: true })) {
                console.log(' exists: %s@%s ~ found %s', name, version, v)
                const cachePkg = path.join(options.cache, deps, x)
                // symlink the package
                const [distSource, binSource] = getSourcePaths(cachePkg, name)
                await link(distSource, binSource)
                return
              }
            }
          }
        }

        // create cache paths
        const cachePkg = path.join(
          options.cache,
          deps,
          util.format('%s@%s', name, semver.clean(version) ?? version.replace(/[^\da-z.-]/gi, ''))
        )
        const [distSource, binSource] = getSourcePaths(cachePkg, name)

        // if not in cache and not --force, download package
        if (options.force || !(await readable(cachePkg))) {
          console.log('install: %s@%s > %s', name, version, cachePkg)

          await fs.mkdir(cachePkg, { recursive: true })

          // remove package-lock when using --force to allow clean install
          if (options.force) {
            try {
              const pkgLock = path.join(cachePkg, 'package-lock.json')
              await fs.rm(pkgLock)
              console.log('removed: %s', pkgLock)
            } catch {}
          }

          // create a phony package with just this package dependency listed
          await fs.writeFile(
            path.join(cachePkg, 'package.json'),
            JSON.stringify({
              // different fields behave differently, when it's a top level use the type
              // used in our package.json and if it's a peer use its parent deps type
              [options.deps ?? deps]: {
                [name]: semver.clean(version)?.toString() ?? version,
              },
              // trustedDependencies used by safe-npm
              trustedDependencies: pkg.trustedDependencies ?? [],
            })
          )

          // run the install and postinstall on the package
          await execInstall(cachePkg)
          await execPostInstall(cachePkg)

          // install this package's peerDependencies
          // TODO: do we need to recurse deeply or are single level peer deps enough?
          if (!options.peer) {
            remainingTasks++
            tasks.push(async () => {
              await install(
                new InstallOptions({
                  root: distSource,
                  peer: true,
                  // inherit force mode
                  force: options.force,
                  // inherit deps field type
                  deps,
                })
              )
            })
          }
        }

        // symlink the package
        await link(distSource, binSource)
      })
    }
  }

  // start flushing queue tasks
  let remainingTasks = tasks.length
  flush()
}
