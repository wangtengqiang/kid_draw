/**
 * 儿童创作用例：选动物、涂色、导出贴图、送进世界。
 * 网页预览可扫主机码进房间。送到后可去看大世界。这里不换主题。
 */
export { exportTexture } from './export-texture'
export { emptySlotCount, listDrafts, MAX_DRAFTS, saveDraft } from './drafts'
export { drawLineArt, drawPreview, drawRegions } from './lineart'
export { inferAnimalId } from './infer-animal'
export { BRUSH_SIZES, PaintSurface } from './paint'
export { parseJoinFromQr } from './scan-qr'
export { ChildCreation } from './screens'
export type { ChildGo } from './screens'
export { sendColoredAnimal, sendToWorld } from './send-to-world'
export type { SendResult } from './send-to-world'
