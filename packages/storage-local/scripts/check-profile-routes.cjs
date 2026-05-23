const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const ts = require('typescript')

const packageRoot = path.resolve(__dirname, '..')
const originalTs = require.extensions['.ts']

require.extensions['.ts'] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
    fileName: filename,
  }).outputText

  module._compile(output, filename)
}

async function readJson(response) {
  return JSON.parse(await response.text())
}

async function main() {
  const cwd = process.cwd()
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'beenthere-profile-routes-'))
  process.chdir(tmp)

  try {
    const { GET, PUT } = require(path.join(packageRoot, 'routes/profile.ts'))
    const demoProfile = { id: 'demo-traveler', name: 'Demo', photos: [] }
    const roamerProfile = { id: 'roamer', name: 'Roamer', photos: [] }

    await PUT(new Request('http://localhost/api/profile?profileId=demo-traveler', {
      method: 'PUT',
      body: JSON.stringify(demoProfile),
    }))
    await PUT(new Request('http://localhost/api/profile?profileId=roamer', {
      method: 'PUT',
      body: JSON.stringify(roamerProfile),
    }))

    assert.deepEqual(
      await readJson(await GET(new Request('http://localhost/api/profile?profileId=demo-traveler'))),
      demoProfile,
      'demo profile should be stored separately',
    )
    assert.deepEqual(
      await readJson(await GET(new Request('http://localhost/api/profile?profileId=roamer'))),
      roamerProfile,
      'roamer profile should be stored separately',
    )
  } finally {
    process.chdir(cwd)
    fs.rmSync(tmp, { recursive: true, force: true })
    if (originalTs) {
      require.extensions['.ts'] = originalTs
    } else {
      delete require.extensions['.ts']
    }
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
