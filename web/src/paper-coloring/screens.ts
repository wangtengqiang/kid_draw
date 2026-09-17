/**
 * 纸上涂色界面：老师下载线稿；孩子选一只、拍照、送进世界。
 * 字要少。不猜未知动物。送到后可去看大世界。
 */
import { officialLineArtSrc, pickCardSrc, drawLineArtReady } from '../child-creation/lineart'
import { decodeQrFromFile, parseJoinFromQr } from '../child-creation/scan-qr'
import { createRoom, ensureRoomForSend, getRoom } from '../sync'
import { storage } from '../storage'
import type { AnimalId, PlacedAnimal } from '../types'
import { ANIMAL_IDS, ANIMAL_META, LAND_IDS, MARINE_IDS, ROOM_CAP } from '../types'
import { mountPetImage } from '../world-exhibition/pet-snapshot'
import { PreviewStage } from '../world-exhibition/preview'
import { imageDataFrom, mapPhotoToTemplate } from './map'
import { sendColoredAnimal } from './send-to-world'
import { downloadTemplateReady, lastPaper, rememberLastPaper } from './template'

export type PaperGo =
  | { name: 'home' }
  | { name: 'host'; roomId: string }
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
  private worldPreview: PreviewStage | null = null

  constructor(root: HTMLElement, go: (s: PaperGo) => void) {
    this.root = root
    this.go = go
  }

  dispose(): void {
    this.previewThumb = ''
    this.previewColors = {}
    this.worldPreview?.dispose()
    this.worldPreview = null
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
      const src = officialLineArtSrc(id) || pickCardSrc(id)
      const img = document.createElement('img')
      img.alt = ANIMAL_META[id].name
      img.width = 240
      img.height = 260
      if (src) {
        img.src = src
      } else {
        const c = document.createElement('canvas')
        c.width = 240
        c.height = 260
        const ctx = c.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#fffaf1'
          ctx.fillRect(0, 0, 240, 260)
          void drawLineArtReady(id, ctx, 240, 260).then(() => {
            img.src = c.toDataURL('image/png')
          })
        }
      }
      const label = document.createElement('strong')
      label.textContent = `下载${ANIMAL_META[id].name}`
      btn.append(img, label)
      btn.addEventListener('click', () => {
        void downloadTemplateReady(id, false)
      })
      prints?.append(btn)

      const sample = document.createElement('button')
      sample.type = 'button'
      sample.className = 'text-link'
      sample.textContent = `样张：涂好的${ANIMAL_META[id].name}`
      sample.addEventListener('click', () => {
        void downloadTemplateReady(id, true)
      })
      samples?.append(sample)
    }
  }

  needScan(): void {
    this.root.innerHTML = `
      <main class="page kid scan-page">
        <button class="back" data-act="home" type="button">返回</button>
        <h1>扫码进入</h1>
        <p class="lead">对准老师主机上的二维码，或选一张二维码图片。不用输入数字。</p>
        <button class="hit scan-file-hit" data-act="file" type="button">选一张二维码图片</button>
        <input id="scan-file" type="file" accept="image/*" hidden />
        <p class="paint-msg" id="scan-msg">云桌面常常没有摄像头，选图片就能进房间。</p>
      </main>`
    this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => this.go({ name: 'home' }))
    const file = this.root.querySelector<HTMLInputElement>('#scan-file')
    this.root.querySelector('[data-act="file"]')?.addEventListener('click', () => file?.click())
    file?.addEventListener('change', () => {
      const picked = file.files?.[0]
      if (picked) void this.joinFromFile(picked)
    })
  }

  private async joinFromFile(file: File): Promise<void> {
    const msg = this.root.querySelector('#scan-msg')
    if (msg) msg.textContent = '正在认这张图…'
    try {
      const text = await decodeQrFromFile(file)
      const roomId = text ? parseJoinFromQr(text) : null
      if (!roomId) {
        if (msg) {
          msg.textContent = '没认出房间码。换一张更清楚的图。'
          msg.classList.add('is-error')
        }
        return
      }
      if (!getRoom(roomId)) {
        createRoom(roomId)
        void storage.createRoom({
          code: roomId,
          theme: 'forest',
          paused: false,
          ended: false,
          hostAliveAt: Date.now(),
          cap: ROOM_CAP,
        })
      }
      this.go({ name: 'paper-pick', roomId })
    } catch {
      if (msg) {
        msg.textContent = '图片打不开。再选一次。'
        msg.classList.add('is-error')
      }
    }
  }

  pick(roomId: string): void {
    if (!getRoom(roomId)) {
      this.root.innerHTML = `<main class="page kid"><h1>展览结束啦</h1><button class="hit kid-hit" data-act="home" type="button">好</button></main>`
      this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => this.go({ name: 'home' }))
      return
    }
    this.root.innerHTML = `
      <main class="page kid">
        <button class="hit kid-hit" data-act="home" type="button">回首页</button>
        <h1>选一只</h1>
        <p class="lead">纸上也是这些动物。不要拍别的画。</p>
        <p class="pick-section">陆地上</p>
        <div class="pick-grid" id="picks-land"></div>
        <p class="pick-section">海里</p>
        <div class="pick-grid" id="picks-sea"></div>
      </main>`
    this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => this.go({ name: 'home' }))
    const fill = (grid: Element | null, ids: readonly AnimalId[]) => {
      for (const id of ids) {
        const card = document.createElement('button')
        card.type = 'button'
        card.className = 'pick-card'
        const img = document.createElement('img')
        img.width = 320
        img.height = 360
        const cardSrc = pickCardSrc(id)
        if (cardSrc) {
          img.src = cardSrc
          img.alt = ANIMAL_META[id].name
          img.classList.add('pet-shot')
        } else mountPetImage(img, id)
        const label = document.createElement('strong')
        label.textContent = ANIMAL_META[id].name
        card.append(img, label)
        card.addEventListener('click', () => this.go({ name: 'paper-camera', roomId, animalId: id }))
        grid?.append(card)
      }
    }
    fill(this.root.querySelector('#picks-land'), LAND_IDS)
    fill(this.root.querySelector('#picks-sea'), MARINE_IDS)
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
        <label class="hit paper-hit">
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
        <p class="lead">${ANIMAL_META[placed.animalId].name}走进主机世界了。点下面就能进去看。</p>
        <div class="preview-frame success-world" id="success-stage">
          <canvas id="success-canvas" aria-label="${ANIMAL_META[placed.animalId].name}"></canvas>
        </div>
        <img class="sent-thumb" id="success-thumb" alt="" hidden />
        <button class="hit host-hit world-jump" data-act="world" type="button">去看大世界</button>
        <button class="hit kid-hit" data-act="again" type="button">再拍一张</button>
      </main>`
    this.root.querySelector('[data-act="world"]')?.addEventListener('click', () =>
      this.go({ name: 'host', roomId }),
    )
    this.root.querySelector('[data-act="again"]')?.addEventListener('click', () =>
      this.go({ name: 'paper-pick', roomId }),
    )
    const canvas = this.root.querySelector<HTMLCanvasElement>('#success-canvas')
    const fallback = this.root.querySelector<HTMLImageElement>('#success-thumb')
    if (!canvas) return
    try {
      this.worldPreview = new PreviewStage(canvas)
      this.worldPreview.show(placed.animalId, placed.regionColors, thumb)
      requestAnimationFrame(() => this.worldPreview?.resize())
    } catch {
      if (fallback) {
        fallback.src = thumb
        fallback.hidden = false
      }
      this.root.querySelector('#success-stage')?.setAttribute('hidden', '')
    }
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
    const rid = ensureRoomForSend(roomId)
    try {
      let result = await sendColoredAnimal({
        roomId: rid,
        animalId,
        thumb: this.previewThumb,
        regionColors: this.previewColors,
      })
      if (!result.ok && (result.reason === 'paused' || result.reason === 'missing')) {
        ensureRoomForSend(rid)
        result = await sendColoredAnimal({
          roomId: rid,
          animalId,
          thumb: this.previewThumb,
          regionColors: this.previewColors,
        })
      }
      if (!result.ok) {
        const reasons = { missing: '展览结束啦', paused: '等一等再送', full: '有点挤，等一等' }
        if (msg) msg.textContent = reasons[result.reason]
        return
      }
      this.go({ name: 'paper-success', roomId: rid, placed: result.placed, thumb: result.item.thumb })
    } catch {
      if (msg) msg.textContent = '没送上，再点一次'
    } finally {
      if (btn) btn.disabled = false
    }
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
