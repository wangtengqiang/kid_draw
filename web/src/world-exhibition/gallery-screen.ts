/**
 * 世界观展：大缩略图画廊。点进去是只读 3D 预览。
 * 不涂色、不送画。
 */
import { ANIMAL_META } from '../types'
import type { GalleryItem } from '../types'
import { getWork, listWorks } from './gallery'

export class GalleryScreen {
  private root: HTMLElement
  private go: (s: { name: 'home' } | { name: 'preview'; item: GalleryItem }) => void

  constructor(
    root: HTMLElement,
    go: (s: { name: 'home' } | { name: 'preview'; item: GalleryItem }) => void,
  ) {
    this.root = root
    this.go = go
  }

  show(): void {
    const items = listWorks()
    this.root.innerHTML = `
      <main class="page">
        <button class="back" data-act="home" type="button">← 首页</button>
        <h1>我的画</h1>
        ${
          items.length
            ? `<div class="gallery-grid" id="g"></div>`
            : `<div class="empty"><p>还没有画。回首页，点「开始画画」。</p></div>`
        }
      </main>`
    this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => this.go({ name: 'home' }))
    const grid = this.root.querySelector('#g')
    items.forEach((item) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'gallery-card'
      b.innerHTML = `<img alt="${ANIMAL_META[item.animalId].name}" src="${item.thumb}" />`
      b.addEventListener('click', () => {
        const fresh = getWork(item.id) ?? item
        this.go({ name: 'preview', item: fresh })
      })
      grid?.append(b)
    })
  }
}
