const { readdirSync } = require('node:fs')
const { basename, join } = require('node:path')
const { spawnSync } = require('node:child_process')

const testDir = __dirname
const tests = readdirSync(testDir)
  .filter(file => file.endsWith('.test.cjs'))
  .sort()

for (const test of tests) {
  const result = spawnSync(process.execPath, [join(testDir, test)], {
    cwd: join(testDir, '..'),
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1
    console.error(`packages/storage-cloud: ${basename(test)} failed`)
    break
  }
}

if (!process.exitCode) {
  console.log(`packages/storage-cloud: ${tests.length} test files passed`)
}
