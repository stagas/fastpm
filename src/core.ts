import { arg } from 'decarg'
import * as fs from 'fs/promises'

export class CoreOptions {
  @arg('--bin', 'npm binary')
  bin = 'safe-npm'

  @arg('--root', 'Project directory with a package.json to act upon')
  root = '.'

  constructor(options: Partial<CoreOptions> = {}) {
    Object.assign(this, options)
  }
}

export const exists = async (pathname: string) => {
  try {
    await fs.lstat(pathname)
    return true
  } catch (error) {
    return false
  }
}
