const fs = require('node:fs')
const ts = require('typescript')

function installTypeScriptLoader() {
  const originals = {
    ts: require.extensions['.ts'],
    tsx: require.extensions['.tsx'],
  }

  function loadTypeScript(module, filename) {
    const source = fs.readFileSync(filename, 'utf8')
    const output = ts.transpileModule(source, {
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
      fileName: filename,
    }).outputText

    module._compile(output, filename)
  }

  require.extensions['.ts'] = loadTypeScript
  require.extensions['.tsx'] = loadTypeScript

  return function restoreTypeScriptLoader() {
    if (originals.ts) require.extensions['.ts'] = originals.ts
    else delete require.extensions['.ts']

    if (originals.tsx) require.extensions['.tsx'] = originals.tsx
    else delete require.extensions['.tsx']
  }
}

module.exports = { installTypeScriptLoader }
