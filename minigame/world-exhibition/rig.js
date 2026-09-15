/**
 * 2D 骨骼：把正面/3/4 剪纸拆成头、身子、四条腿，对角迈步。
 * 关节在图上的归一化盒，按官方 cutout 量的。
 */
const RIGS = {
  deer: {
    order: ['legBR', 'legBL', 'body', 'legFR', 'legFL', 'head'],
    parts: {
      body: { sx: 0.14, sy: 0.3, sw: 0.7, sh: 0.4, ox: 0.5, oy: 0.62, px: 0.5, py: 0.88 },
      head: { sx: 0.06, sy: 0.0, sw: 0.78, sh: 0.4, ox: 0.46, oy: 0.36, px: 0.52, py: 0.92 },
      legFL: { sx: 0.16, sy: 0.58, sw: 0.22, sh: 0.42, ox: 0.3, oy: 0.64, px: 0.5, py: 0.08 },
      legFR: { sx: 0.34, sy: 0.58, sw: 0.22, sh: 0.42, ox: 0.44, oy: 0.64, px: 0.5, py: 0.08 },
      legBL: { sx: 0.5, sy: 0.56, sw: 0.22, sh: 0.44, ox: 0.58, oy: 0.62, px: 0.5, py: 0.1 },
      legBR: { sx: 0.66, sy: 0.56, sw: 0.22, sh: 0.44, ox: 0.72, oy: 0.62, px: 0.5, py: 0.1 },
    },
  },
  tiger: {
    order: ['tail', 'legBR', 'legBL', 'body', 'legFR', 'legFL', 'head'],
    parts: {
      body: { sx: 0.22, sy: 0.3, sw: 0.62, sh: 0.42, ox: 0.52, oy: 0.58, px: 0.45, py: 0.82 },
      head: { sx: 0.0, sy: 0.0, sw: 0.58, sh: 0.52, ox: 0.28, oy: 0.38, px: 0.62, py: 0.78 },
      legFL: { sx: 0.1, sy: 0.56, sw: 0.22, sh: 0.44, ox: 0.24, oy: 0.62, px: 0.5, py: 0.08 },
      legFR: { sx: 0.3, sy: 0.56, sw: 0.22, sh: 0.44, ox: 0.4, oy: 0.62, px: 0.5, py: 0.08 },
      legBL: { sx: 0.52, sy: 0.5, sw: 0.22, sh: 0.5, ox: 0.62, oy: 0.58, px: 0.5, py: 0.1 },
      legBR: { sx: 0.68, sy: 0.5, sw: 0.22, sh: 0.5, ox: 0.76, oy: 0.58, px: 0.5, py: 0.1 },
      tail: { sx: 0.78, sy: 0.4, sw: 0.22, sh: 0.32, ox: 0.88, oy: 0.52, px: 0.15, py: 0.3 },
    },
  },
  lion: {
    order: ['tail', 'legBR', 'legBL', 'body', 'legFR', 'legFL', 'head'],
    parts: {
      body: { sx: 0.28, sy: 0.32, sw: 0.55, sh: 0.4, ox: 0.55, oy: 0.58, px: 0.4, py: 0.82 },
      head: { sx: 0.0, sy: 0.0, sw: 0.62, sh: 0.58, ox: 0.3, oy: 0.4, px: 0.58, py: 0.8 },
      legFL: { sx: 0.16, sy: 0.56, sw: 0.2, sh: 0.44, ox: 0.28, oy: 0.62, px: 0.5, py: 0.08 },
      legFR: { sx: 0.34, sy: 0.56, sw: 0.2, sh: 0.44, ox: 0.42, oy: 0.62, px: 0.5, py: 0.08 },
      legBL: { sx: 0.54, sy: 0.5, sw: 0.2, sh: 0.5, ox: 0.62, oy: 0.58, px: 0.5, py: 0.1 },
      legBR: { sx: 0.68, sy: 0.5, sw: 0.22, sh: 0.5, ox: 0.76, oy: 0.58, px: 0.5, py: 0.1 },
      tail: { sx: 0.78, sy: 0.42, sw: 0.22, sh: 0.3, ox: 0.9, oy: 0.52, px: 0.12, py: 0.28 },
    },
  },
}

function poseFor(gait) {
  const swing = Math.sin(gait)
  const liftA = Math.max(0, -swing)
  const liftB = Math.max(0, swing)
  return {
    body: { rot: swing * 0.045, lift: Math.abs(Math.sin(gait * 2)) * 0.018 },
    head: { rot: swing * 0.07, lift: 0 },
    legFL: { rot: swing * 0.22, lift: liftA * 0.028 },
    legBR: { rot: swing * 0.2, lift: liftA * 0.024 },
    legFR: { rot: -swing * 0.22, lift: liftB * 0.028 },
    legBL: { rot: -swing * 0.2, lift: liftB * 0.024 },
    tail: { rot: Math.sin(gait * 1.4) * 0.25, lift: 0 },
  }
}

function drawPart(ctx, img, part, destW, destH, pose) {
  if (!part || !img || !img.width) return
  const sx = part.sx * img.width
  const sy = part.sy * img.height
  const sw = Math.max(1, part.sw * img.width)
  const sh = Math.max(1, part.sh * img.height)
  const dw = part.sw * destW
  const dh = part.sh * destH
  const ox = part.ox * destW
  const oy = part.oy * destH - (pose.lift || 0) * destH
  ctx.save()
  ctx.translate(ox, oy)
  ctx.rotate(pose.rot || 0)
  ctx.drawImage(img, sx, sy, sw, sh, -part.px * dw, -part.py * dh, dw, dh)
  ctx.restore()
}

/**
 * 在 (0,0)-(w,h) 里画一只正在走的剪纸骨骼。脚在底边。
 */
function drawRiggedCutout(ctx, img, animalId, w, h, gait) {
  if (!img || !img.width) return false
  const rig = RIGS[animalId] || RIGS.deer
  const pose = poseFor(gait)
  const bodyLift = (pose.body.lift || 0) * h
  ctx.save()
  ctx.translate(0, -bodyLift)
  ctx.translate(w * 0.5, h * 0.62)
  ctx.rotate(pose.body.rot || 0)
  ctx.translate(-w * 0.5, -h * 0.62)
  rig.order.forEach((name) => {
    const part = rig.parts[name]
    if (!part) return
    const local = name === 'body' ? { rot: 0, lift: 0 } : pose[name] || { rot: 0, lift: 0 }
    drawPart(ctx, img, part, w, h, local)
  })
  ctx.restore()
  return true
}

module.exports = { RIGS, poseFor, drawRiggedCutout }
