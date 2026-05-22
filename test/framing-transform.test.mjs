import assert from 'node:assert/strict'

import {
  heroTransformToTextureTransform,
  shapeFrameToTextureTransform,
} from '../.test-build/components/globe/framingTransform.js'

function sampledCenter({ repeat, offset }) {
  return {
    u: 0.5 * repeat.x + offset.x,
    v: 0.5 * repeat.y + offset.y,
  }
}

{
  const textureTransform = heroTransformToTextureTransform({ x: 0.2, y: 0.15, scale: 2 })
  const center = sampledCenter(textureTransform)

  assert.equal(center.u, 0.4)
  assert.equal(center.v, 0.575)
}

{
  const textureTransform = heroTransformToTextureTransform({ x: 0, y: -0.2, scale: 4 })
  const center = sampledCenter(textureTransform)

  assert.equal(center.u, 0.5)
  assert.equal(center.v, 0.45)
}

{
  const textureTransform = shapeFrameToTextureTransform({
    frame: { width: 100, height: 100 },
    imageRect: { x: 0, y: 0, width: 100, height: 100 },
    shapeBounds: { x: 10, y: 20, width: 40, height: 20 },
    shapeX: 5,
    shapeY: -10,
    shapeScale: 1,
  })

  assert.deepEqual(textureTransform, {
    repeat: { x: 0.4, y: 0.2 },
    offset: { x: 0.15, y: 0.7 },
  })
}

{
  const textureTransform = heroTransformToTextureTransform({
    x: 99,
    y: 99,
    scale: 99,
    textureOffsetX: 0.15,
    textureOffsetY: 0.7,
    textureRepeatX: 0.4,
    textureRepeatY: 0.2,
  })

  assert.deepEqual(textureTransform, {
    repeat: { x: 0.4, y: 0.2 },
    offset: { x: 0.15, y: 0.7 },
  })
}
