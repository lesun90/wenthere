const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const demoRoute = fs.readFileSync(path.resolve(__dirname, '../app/demo/page.tsx'), 'utf8')
const stressRoute = fs.readFileSync(path.resolve(__dirname, '../app/stresstest/page.tsx'), 'utf8')
const experience = fs.existsSync(path.resolve(__dirname, '../app/ProfileExperience.tsx'))
  ? fs.readFileSync(path.resolve(__dirname, '../app/ProfileExperience.tsx'), 'utf8')
  : ''

assert.match(demoRoute, /ProfileExperience/, 'demo should use the shared profile experience')
assert.match(stressRoute, /ProfileExperience/, 'stresstest should use the shared profile experience')
assert.match(experience, /ProfileProvider/, 'shared profile experience should use the editable profile provider')
assert.match(experience, /LocalProfileStore/, 'shared profile experience should use local profile storage')
assert.match(experience, /onDeletePhoto=\{/, 'shared profile experience should wire photo deletion')
assert.match(experience, /onEditPhoto=\{/, 'shared profile experience should wire photo editing')
assert.match(experience, /onImportFiles=\{/, 'shared profile experience should wire photo import')
