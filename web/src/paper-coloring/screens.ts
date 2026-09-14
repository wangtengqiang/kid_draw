/**
 * 纸上涂色界面：老师下载线稿；孩子选一只、拍照、送进世界。
 * 字要少。不猜未知动物。不进主机森林。
 */
import { drawPreview } from '../child-creation/lineart'
import { getRoom } from '../sync'
import type { AnimalId, PlacedAnimal } from '../types'
import { ANIMAL_IDS, ANIMAL_META } from '../types'
import { imageDataFrom, mapPhotoToTemplate } from './map'
import { sendColoredAnimal } from './send-to-world'
import { downloadTemplate, lastPaper, rememberLastPaper } from './template'

export type PaperGo =
  | { name: 'home' }
  | { name: 'paper-print' }
  | { name: 'paper-need-scan' }
  | { name: 'paper-pick'; roomId: string }
  | { name: 'paper-camera'; roomId: string; animalId: AnimalId }
  | { name: 'paper-success'; roomId: string; placed: PlacedAnimal; thumb: string }

export class PaperColoring {
  private root: HTMLElement
  private go: (s: PaperGo) => void
  private previewThumb = ''
  private previewColors: Record<string, string> = {}

  constructor(root: HTMLElement, go: (s: PaperGo) => void) {
    this.root = root
    this.go = go
  }

  dispose(): void {
    this.previewThumb = ''
    this.previewColors = {}
  }

  print(): void {
    this.root.innerHTML = `
      <main class="page">
        <button class="back" data-act="home" type="button">返回</button>
        <h1>打印线稿</h1>
        <p class="lead">给老师、家长。打印后让小朋友涂，再拍进去。孩子首页不会看到这一页。</p>
        <div class="print-grid" id="prints"></div>
        <p class="lead">网页演示也可下一张已经涂红身子的样张。</p>
        <div class="print-samples" id="samples"></div>
      </main>`
    this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => this.go({ name: 'home' }))
    const prints = this.root.querySelector('#prints')
    const samples = this.root.querySelector('#samples')
    for (const id of ANIMAL_IDS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'pick-card'
      const c = document.createElement('canvas')
      c.width = 240
      c.height = 260
      const ctx = c.getContext('2d')
      if (ctx) drawPreview(id, ctx, c.width, c.height)
      const label = document.createElement('strong')
      label.textContent = `下载${ANIMAL_META[id].name}`
      btn.append(c, label)
      btn.addEventListener('click', () => downloadTemplate(id, false))
      prints?.append(btn)

      const sample = document.createElement('button')
      sample.type = 'button'
      sample.className = 'text-link'
      sample.textContent = `样张：涂好的${ANIMAL_META[id].name}`
      sample.addEventListener('click', () => downloadTemplate(id, true))
      samples?.append(sample)
    }
  }

  needScan(): void {
    this.root.innerHTML = `
      <main class="page kid">
        <button class="back" data-act="home" type="button">返回</button>
        <h1>请扫老师的码</h1>
        <p class="lead">扫完就能拍纸上的画。</p>
      </main>`
    this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => this.go({ name: 'home' }))
  }

  pick(roomId: string): void {
    if (!getRoom(roomId)) {
      this.root.innerHTML = `<main class="page kid"><h1>展览结束啦</h1><button class="hit kid-hit" data-act="home" type="button">好</button></main>`
      this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => this.go({ name: 'home' }))
      return
    }
    this.root.innerHTML = `
      <main class="page kid">
        <h1>选一只</h1>
        <p class="lead">纸上也是这三只。不要拍别的画。</p>
        <div class="pick-grid" id="picks"></div>
      </main>`
    const grid = this.root.querySelector('#picks')
    for (const id of ANIMAL_IDS) {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'pick-card'
      const c = document.createElement('canvas')
      c.width = 320
      c.height = 360
      const ctx = c.getContext('2d')
      if (ctx) drawPreview(id, ctx, c.width, c.height)
      const label = document.createElement('strong')
      label.textContent = ANIMAL_META[id].name
      card.append(c, label)
      card.addEventListener('click', () => this.go({ name: 'paper-camera', roomId, animalId: id }))
      grid?.append(card)
    }
  }

  camera(roomId: string, animalId: AnimalId): void {
    this.previewThumb = ''
    this.previewColors = {}
    const saved = lastPaper()
    this.root.innerHTML = `
      <main class="page kid">
        <button class="back" data-act="pick" type="button">重选动物</button>
        <h1>拍纸上的画</h1>
        <p class="lead">对准四角黑块。这是${ANIMAL_META[animalId].name}。</p>
        <label class="camera-hit">
          拍照
          <input id="paper-file" type="file" accept="image/*" capture="environment" hidden />
        </label>
        <label class="text-link">
          相册
          <input id="paper-album" type="file" accept="image/*" hidden />
        </label>
        ${saved ? `<button class="text-link" data-act="last" type="button">用刚下载的纸</button>` : ''}
        <img class="sent-thumb" id="paper-preview" alt="" hidden />
        <p class="paint-msg" id="paper-msg"></p>
        <button class="send-hit" data-act="send" type="button" hidden>送进世界</button>
      </main>`
    this.root.querySelector('[data-act="pick"]')?.addEventListener('click', () =>
      this.go({ name: 'paper-pick', roomId }),
    )
    const file = this.root.querySelector<HTMLInputElement>('#paper-file')
    const album = this.root.querySelector<HTMLInputElement>('#paper-album')
    file?.addEventListener('change', () => {
      const f = file.files?.[0]
      if (f) void this.useFile(f, animalId)
    })
    album?.addEventListener('change', () => {
      const f = album.files?.[0]
      if (f) void this.useFile(f, animalId)
    })
    this.root.querySelector('[data-act="last"]')?.addEventListener('click', () => {
      if (saved) void this.useDataUrl(saved.dataUrl, animalId)
    })
    this.root.querySelector('[data-act="send"]')?.addEventListener('click', () => {
      void this.send(roomId, animalId)
    })
  }

  success(roomId: string, placed: PlacedAnimal, thumb: string): void {
    this.root.innerHTML = `
      <main class="page kid">
        <h1>送到啦</h1>
        <p class="lead">${ANIMAL_META[placed.animalId].name}走进主机世界了。</p>
        <img class="sent-thumb" alt="" src="${thumb}" />
        <button class="hit kid-hit" data-act="again" type="button">再拍一张</button>
      </main>`
    this.root.querySelector('[data-act="again"]')?.addEventListener('click', () =>
      this.go({ name: 'paper-pick', roomId }),
    )
  }

  private async useFile(file: File, animalId: AnimalId): Promise<void> {
    const url = URL.createObjectURL(file)
    try {
      await this.useDataUrl(url, animalId)
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  private async useDataUrl(url: string, animalId: AnimalId): Promise<void> {
    const msg = this.root.querySelector('#paper-msg')
    if (msg) msg.textContent = '正在对准…'
    const img = await loadImage(url)
    const data = imageDataFrom(img)
    const mapped = mapPhotoToTemplate(data, animalId)
    this.previewThumb = mapped.thumb
    this.previewColors = mapped.regionColors
    rememberLastPaper(url.startsWith('data:') ? url : mapped.thumb, animalId)
    const preview = this.root.querySelector<HTMLImageElement>('#paper-preview')
    const send = this.root.querySelector<HTMLButtonElement>('[data-act="send"]')
    if (preview) {
      preview.src = mapped.thumb
      preview.hidden = false
    }
    if (send) send.hidden = false
    if (msg) msg.textContent = mapped.aligned ? '对准啦' : '没看到四角，就按整张纸对了一下。'
  }

  private async send(roomId: string, animalId: AnimalId): Promise<void> {
    if (!this.previewThumb) return
    const msg = this.root.querySelector('#paper-msg')
    const btn = this.root.querySelector<HTMLButtonElement>('[data-act="send"]')
    if (btn) btn.disabled = true
    if (msg) msg.textContent = '正在送…'
    const result = await sendColoredAnimal({
      roomId,
      animalId,
      thumb: this.previewThumb,
      regionColors: this.previewColors,
    })
    if (!result.ok) {
      const reasons = { missing: '展览结束啦', paused: '等一等再送', full: '有点挤，等一等' }
      if (msg) msg.textContent = reasons[result.reason]
      if (btn) btn.disabled = false
      return
    }
    this.go({ name: 'paper-success', roomId, placed: result.placed, thumb: result.item.thumb })
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('读不出这张图'))
    img.src = url
  })
}
