import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const globeSource = readFileSync(new URL('../components/globe/Globe.tsx', import.meta.url), 'utf8');
const pinPickerSource = readFileSync(new URL('../components/globe/GlobePinPicker.tsx', import.meta.url), 'utf8');

assert.match(
  globeSource,
  /allowCanvasInteractionThroughHtmlLayer\(globe\)/,
  'Globe initialization should make Globe.gl HTML overlay pass pointer events through to the canvas.'
);

assert.match(
  globeSource,
  /pointer-events:auto/,
  'Clickable photo badges should opt back into pointer events after the overlay passes through.'
);

assert.match(
  pinPickerSource,
  /allowCanvasInteractionThroughHtmlLayer\(globe\)/,
  'The upload pin picker should also make Globe.gl HTML overlay pass pointer events through to the canvas.'
);
