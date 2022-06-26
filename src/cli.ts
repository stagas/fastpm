#!/usr/bin/env node

import { decarg } from 'decarg'
import * as path from 'path'
import { install, InstallOptions } from './install'
import { link, LinkOptions } from './link'

const isTTY = typeof process !== 'undefined' && process.stdout.isTTY
const GREY = isTTY ? '\x1b[90m' : ''
const RESET = isTTY ? '\x1b[0m' : ''
const BOLD = isTTY ? '\x1b[1m' : ''
const RED = isTTY ? BOLD + '\x1b[31m' : ''

const help = () => {
  console.log(`${BOLD}Usage:${RESET} ${path.basename(argv[1])} [command] [options] [--help]\n`)
  console.log(`${BOLD}Commands:${RESET}`)
  console.log('  install [options] [--help]')
  console.log(`${GREY}    Install dependencies under current project (default when none is passed)${RESET}\n`)
  console.log('  link <source> [options] [--help]')
  console.log(`${GREY}    Link <source> package under current project${RESET}\n`)
  console.log('  help')
  console.log(`${GREY}    Show this message${RESET}`)
  console.log('')
}

const argv = process.argv.slice()
if (argv.length === 3) {
  if (['help', '--help', '-h'].includes(argv[2])) {
    help()
    process.exit(0)
  }
}

// find command
const command = argv.slice(2).find(x => x[0] !== '-')

// allow interruption
process.setMaxListeners(Infinity)
process.on('SIGINT', () => {
  console.log('interrupted')
  process.removeAllListeners('beforeExit')
})

switch (command) {
  case 'link': {
    argv[1] += ' link'
    argv.splice(argv.indexOf(command), 1)

    const options = decarg(new LinkOptions(), argv.slice(1))
    console.log(options)
    console.time('link time')
    process.once('beforeExit', () => {
      console.timeEnd('link time')
      console.log('all done.')
    })

    link(options!)

    break
  }
  case 'install':
    argv[1] += ' install'
    argv.splice(argv.indexOf(command), 1)
  // eslint-disable-next-line no-fallthrough
  case undefined: {
    const options = decarg(new InstallOptions(), argv.slice(1))
    console.log(options)
    console.time('installation time')
    process.once('beforeExit', () => {
      console.timeEnd('installation time')
      console.log('all done.')
    })

    install(options!)

    break
  }
  default:
    help()
    console.log(`${RED}No such command "${command}"${RESET}\n`)
    process.exit(1)
}
