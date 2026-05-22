import type { HeroTransform } from './types'

export interface TextureFrameTransform {
  repeat: { x: number; y: number }
  offset: { x: number; y: number }
}

export interface FrameRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ShapeFrameTransformInput {
  frame: { width: number; height: number }
  imageRect: FrameRect
  shapeBounds: FrameRect
  shapeX: number
  shapeY: number
  shapeScale: number
}

export function isIdentityHeroTransform(t: HeroTransform): boolean {
  return t.x === 0 && t.y === 0 && t.scale === 1
    && t.textureOffsetX === undefined
    && t.textureOffsetY === undefined
    && t.textureRepeatX === undefined
    && t.textureRepeatY === undefined
}

export function sameHeroTransform(a?: HeroTransform, b?: HeroTransform) {
  if (a === b) return true
  if (!a || !b) return false
  return a.x === b.x
    && a.y === b.y
    && a.scale === b.scale
    && a.textureOffsetX === b.textureOffsetX
    && a.textureOffsetY === b.textureOffsetY
    && a.textureRepeatX === b.textureRepeatX
    && a.textureRepeatY === b.textureRepeatY
}

export function heroTransformToTextureTransform(t: HeroTransform): TextureFrameTransform {
  if (
    t.textureOffsetX !== undefined
    && t.textureOffsetY !== undefined
    && t.textureRepeatX !== undefined
    && t.textureRepeatY !== undefined
  ) {
    return {
      repeat: { x: t.textureRepeatX, y: t.textureRepeatY },
      offset: { x: t.textureOffsetX, y: t.textureOffsetY },
    }
  }

  const repeat = 1 / t.scale

  return {
    repeat: { x: repeat, y: repeat },
    offset: {
      x: 0.5 - (0.5 + t.x) / t.scale,
      y: 0.5 - (0.5 - t.y) / t.scale,
    },
  }
}

export function shapeFrameToTextureTransform({
  frame,
  imageRect,
  shapeBounds,
  shapeX,
  shapeY,
  shapeScale,
}: ShapeFrameTransformInput): TextureFrameTransform {
  const cx = frame.width / 2
  const cy = frame.height / 2
  const repeatX = shapeScale * shapeBounds.width / imageRect.width
  const repeatY = shapeScale * shapeBounds.height / imageRect.height
  const imageTopAtSouth = (
    shapeScale * (shapeBounds.y + shapeBounds.height - cy)
    + cy
    + shapeY
    - imageRect.y
  ) / imageRect.height

  return {
    repeat: { x: repeatX, y: repeatY },
    offset: {
      x: (
        shapeScale * (shapeBounds.x - cx)
        + cx
        + shapeX
        - imageRect.x
      ) / imageRect.width,
      y: 1 - imageTopAtSouth,
    },
  }
}
