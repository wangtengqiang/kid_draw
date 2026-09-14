/**
 * 儿童创作用例：选动物、涂色、导出贴图、送进世界。
 * 网页预览可扫主机码进房间。这里不渲染主机森林、不换主题、不画 3D 预览。
 */
export { exportTexture } from './export-texture'
export { emptySlotCount, listDrafts, MAX_DRAFTS, saveDraft } from './drafts'
export { drawLineArt, drawPreview, drawRegions } from './lineart'
export { PaintSurface } from './paint'
export { parseJoinFromQr } from './scan-qr'
export { ChildCreation } from './screens'
export type { ChildGo } from './screens'
export { sendColoredAnimal, sendToWorld } from './send-to-world'
export type { SendResult } from './send-to-world'
