const assert = require('node:assert/strict')
const path = require('node:path')
const { installTypeScriptLoader } = require('./helpers/load-ts.cjs')

const restore = installTypeScriptLoader()

try {
  const {
    heroTransformToTextureTransform,
    isIdentityHeroTransform,
    sameHeroTransform,
    shapeFrameToTextureTransform,
  } = require(path.resolve(__dirname, '../components/globe/framingTransform.ts'))

  function sampledCenter({ repeat, offset }) {
    return {
      u: 0.5 * repeat.x + offset.x,
      v: 0.5 * repeat.y + offset.y,
    }
  }

  assert.equal(isIdentityHeroTransform({ x: 0, y: 0, scale: 1 }), true)
  assert.equal(isIdentityHeroTransform({ x: 0, y: 0, scale: 1, textureOffsetX: 0 }), false)
  assert.equal(sameHeroTransform(undefined, undefined), true)
  assert.equal(sameHeroTransform({ x: 0, y: 0, scale: 1 }, undefined), false)
  assert.equal(
    sameHeroTransform(
      { x: 0.1, y: -0.2, scale: 1.5, textureOffsetX: 0.2 },
      { x: 0.1, y: -0.2, scale: 1.5, textureOffsetX: 0.2 },
    ),
    true,
  )
  assert.equal(
    sameHeroTransform(
      { x: 0.1, y: -0.2, scale: 1.5, textureOffsetX: 0.2 },
      { x: 0.1, y: -0.2, scale: 1.5, textureOffsetX: 0.3 },
    ),
    false,
  )

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
} finally {
  restore()
}
