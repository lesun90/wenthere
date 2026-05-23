const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const appRoot = path.resolve(__dirname, '..')
const originalTs = require.extensions['.ts']

require.extensions['.ts'] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText

  module._compile(output, filename)
}

try {
  const { fileNameFor } = require(path.join(appRoot, 'app/geo/subdivisions/filename.ts'))

  assert.equal(fileNameFor('PFA+00?.geojson'), 'PFA+00?.geojson')
  assert.equal(fileNameFor('USA-3521.geojson'), 'USA-3521.geojson')
  assert.equal(fileNameFor('../USA-3521.geojson'), null)
  assert.equal(fileNameFor('USA\\3521.geojson'), null)
  assert.equal(fileNameFor('USA-3521.json'), null)
} finally {
  if (originalTs) {
    require.extensions['.ts'] = originalTs
  } else {
    delete require.extensions['.ts']
  }
}
