/**
 * 世界观展：单只动物 3D 转台。只读，不能涂、不能送。
 */
import { ANIMAL_META } from '../types'
import type { GalleryItem } from '../types'
import { PreviewStage } from './preview'

export class PreviewScreen {
  private stage: PreviewStage | null = null
  private root: HTMLElement
  private goGallery: () => void

  constructor(root: HTMLElement, goGallery: () => void) {
    this.root = root
    this.goGallery = goGallery
  }

  dispose(): void {
    this.stage?.dispose()
    this.stage = null
  }

  show(item: GalleryItem): void {
    this.dispose()
    this.root.innerHTML = `
      <main class="page">
        <button class="back" data-act="gallery" type="button">← 作品夹</button>
        <h1>${ANIMAL_META[item.animalId].name}</h1>
        <p class="lead">这是你的小舞台，不是主机那片森林。拖一拖能转，捏一捏或滚轮能拉近。</p>
        <div class="preview-frame tall"><canvas id="preview-canvas"></canvas></div>
      </main>`
    const canvas = this.root.querySelector<HTMLCanvasElement>('#preview-canvas')
    if (canvas) {
      this.stage = new PreviewStage(canvas)
      this.stage.show(item.animalId, item.regionColors)
    }
    this.root.querySelector('[data-act="gallery"]')?.addEventListener('click', () => this.goGallery())
  }
}
