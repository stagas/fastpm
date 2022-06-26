import { arg } from 'decarg'
import * as fs from 'fs/promises'
import * as path from 'path'
import { CoreOptions, exists } from './core'

const sort = (data: any) => {
  const sorted = Object.fromEntries(
    Object.entries(data).sort(([a]: any, [b]: any) => (a > b ? 1 : -1))
  )
  for (const key in data) delete data[key]
  Object.assign(data, sorted)
  return data
}

export class LinkOptions extends CoreOptions {
  @arg('<source>', 'Package path to link to project')
  source!: string

  @arg('-D', '--dev', 'Save in devDependencies')
  dev = false

  constructor(options: Partial<LinkOptions> = {}) {
    super(options)
    Object.assign(this, options)
  }
}

export const link = async (options: LinkOptions) => {
  const root = path.resolve(options.root)
  const sourcePath = path.resolve(options.source)
  const relativePath = path.relative(root, sourcePath)

  // read root's package.json
  const pkg = await import(path.join(sourcePath, 'package.json'))
  delete pkg.default
  const target = path.join(root, 'node_modules', pkg.name)

  console.log('linking', sourcePath, target)

  if (await exists(target)) {
    try {
      await fs.rm(target, { recursive: true })
    } catch {
      await fs.unlink(target)
    }
  }
  await fs.mkdir(path.resolve(target, '..'), { recursive: true })
  await fs.symlink(sourcePath, target)

  if (pkg.bin) {
    for (const [bin, src] of Object.entries(pkg.bin) as [string, string][]) {
      const binTarget = path.join(root, 'node_modules', '.bin', bin)

      console.log('linking bin', src, binTarget)

      await fs.mkdir(path.dirname(binTarget), { recursive: true })
      if (await exists(binTarget)) await fs.unlink(binTarget)
      await fs.symlink(path.join(sourcePath, src), binTarget, 'junction')
      await fs.chmod(binTarget, 0o755)
    }
  }

  const targetPkgJson = path.join(root, 'package.json')
  const targetPkg = await import(targetPkgJson)
  delete targetPkg.default
  const deps = options.dev ? 'devDependencies' : 'dependencies'
  const otherDeps = options.dev ? 'dependencies' : 'devDependencies'
  targetPkg[deps] ??= {}
  targetPkg[deps][pkg.name] = `file:${relativePath}`
  sort(targetPkg[deps])
  if (otherDeps in targetPkg && pkg.name in targetPkg[otherDeps]) {
    delete targetPkg[otherDeps][pkg.name]
    if (!Object.keys(targetPkg[otherDeps]).length) {
      delete targetPkg[otherDeps]
    } else {
      sort(targetPkg[otherDeps])
    }
  }

  await fs.writeFile(targetPkgJson, JSON.stringify(targetPkg, null, 2) + '\n', 'utf-8')
}
