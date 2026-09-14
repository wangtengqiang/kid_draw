/**
 * 儿童创作用例界面：选一只 → 大蜡笔涂色 → 送进世界。
 * 网页预览可直接涂；扫码（摄像头或选图片）进老师的房。不进主机森林。
 */
import { createRoom, getRoom } from '../sync'
import { storage } from '../storage'
import type { AnimalId, PlacedAnimal } from '../types'
import { ANIMAL_IDS, ANIMAL_META, PALETTE, ROOM_CAP } from '../types'
import { loadDraft, saveDraft } from './drafts'
import { drawPreview } from './lineart'
import { PaintSurface } from './paint'
import { decodeQrFromFile, decodeQrFromImageData, parseJoinFromQr } from './scan-qr'
import { sendToWorld } from './send-to-world'

export type ChildGo =
  | { name: 'home' }
  | { name: 'need-scan' }
  | { name: 'scan' }
  | { name: 'pick'; roomId: string }
  | { name: 'paint'; roomId: string; animalId: AnimalId }
  | { name: 'success'; roomId: string; placed: PlacedAnimal; thumb: string }
  | { name: 'ended' }

export class ChildCreation {
  private paint: PaintSurface | null = null
  private root: HTMLElement
  private go: (s: ChildGo) => void
  private media: MediaStream | null = null
  private scanRaf = 0

  constructor(root: HTMLElement, go: (s: ChildGo) => void) {
    this.root = root
    this.go = go
  }

  dispose(): void {
    this.paint = null
    this.stopCamera()
  }

  private stopCamera(): void {
    if (this.scanRaf) cancelAnimationFrame(this.scanRaf)
    this.scanRaf = 0
    this.media?.getTracks().forEach((t) => t.stop())
    this.media = null
  }

  needScan(): void {
    this.root.innerHTML = `
      <main class="page kid">
        <button class="back" data-act="home" type="button">返回</button>
        <h1>请扫老师的码</h1>
        <p class="lead">用摄像头扫，或选一张二维码图片。不用输入数字。</p>
        <button class="hit kid-hit" data-act="scan" type="button">扫码进入</button>
      </main>`
    this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => this.go({ name: 'home' }))
    this.root.querySelector('[data-act="scan"]')?.addEventListener('click', () => this.go({ name: 'scan' }))
  }

  scan(): void {
    this.stopCamera()
    this.root.innerHTML = `
      <main class="page kid scan-page">
        <button class="back" data-act="home" type="button">返回</button>
        <h1>扫码进入</h1>
        <p class="lead">对准老师主机上的二维码。这个电脑如果开不了摄像头，就选一张二维码图片。</p>
        <video class="scan-video" id="scan-video" playsinline muted autoplay></video>
        <button class="hit kid-hit" data-act="camera" type="button">打开摄像头</button>
        <button class="hit scan-file-hit" data-act="file" type="button">选一张二维码图片</button>
        <input id="scan-file" type="file" accept="image/*" hidden />
        <p class="paint-msg" id="scan-msg">还没有扫。云桌面常常没有摄像头，用选图片也能进房间。</p>
      </main>`
    this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => this.go({ name: 'home' }))
    this.root.querySelector('[data-act="camera"]')?.addEventListener('click', () => {
      void this.startCamera()
    })
    const file = this.root.querySelector<HTMLInputElement>('#scan-file')
    this.root.querySelector('[data-act="file"]')?.addEventListener('click', () => file?.click())
    file?.addEventListener('change', () => {
      const picked = file.files?.[0]
      if (picked) void this.joinFromFile(picked)
    })
  }

  ended(): void {
    this.root.innerHTML = `
      <main class="page kid">
        <h1>展览结束啦</h1>
        <button class="hit kid-hit" data-act="home" type="button">好</button>
      </main>`
    this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => this.go({ name: 'home' }))
  }

  pick(roomId: string): void {
    if (!getRoom(roomId)) {
      this.ended()
      return
    }
    this.root.innerHTML = `
      <main class="page kid">
        <button class="hit kid-hit" data-act="home" type="button">回首页</button>
        <h1>选一只</h1>
        <p class="lead">点一张大卡片就开始涂。想换动物，涂色页有大按钮「重选动物」。</p>
        <div class="pick-grid" id="picks"></div>
      </main>`
    this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => this.go({ name: 'home' }))
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
      const draft = loadDraft(roomId, id)
      label.textContent = draft ? `${ANIMAL_META[id].name} · 有草稿` : ANIMAL_META[id].name
      card.append(c, label)
      card.addEventListener('click', () => this.go({ name: 'paint', roomId, animalId: id }))
      grid?.append(card)
    }
  }

  paintScreen(roomId: string, animalId: AnimalId): void {
    this.paint = new PaintSurface(animalId, () => undefined)
    this.paint.brush = 36
    this.paint.colorHex = PALETTE[3]!.hex
    this.root.innerHTML = `
      <main class="page paint-page">
        <div class="paint-bar">
          <button class="hit kid-hit" data-act="pick" type="button">重选动物</button>
          <button class="hit draft-hit" data-act="draft" type="button">保存草稿</button>
        </div>
        <div class="paint-body" id="paint-body">
          <div class="loading-mask" id="paint-load">正在打开画纸…</div>
        </div>
        <div class="crayons" id="crayons"></div>
        <button class="send-hit" data-act="send" type="button">送进世界</button>
        <p class="paint-msg" id="paint-msg">点色块就能涂。换动物不用输房号。</p>
      </main>`
    this.root.querySelector('#paint-body')?.append(this.paint.wrap)
    const crayons = this.root.querySelector('#crayons')
    PALETTE.forEach((c, i) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = `crayon ${i === 3 ? 'on' : ''}`
      b.style.background = c.hex
      b.setAttribute('aria-label', c.name)
      b.addEventListener('click', () => {
        if (!this.paint) return
        this.paint.colorHex = c.hex
        crayons?.querySelectorAll('.crayon').forEach((el) => el.classList.remove('on'))
        b.classList.add('on')
      })
      crayons?.append(b)
    })
    this.root.querySelector('[data-act="pick"]')?.addEventListener('click', () => this.go({ name: 'pick', roomId }))
    this.root.querySelector('[data-act="draft"]')?.addEventListener('click', () => this.persistDraft(roomId, animalId))
    this.root.querySelector('[data-act="send"]')?.addEventListener('click', () => {
      void this.send(roomId, animalId)
    })
    void this.restoreDraft(roomId, animalId)
  }

  success(roomId: string, placed: PlacedAnimal, thumb: string): void {
    this.root.innerHTML = `
      <main class="page kid">
        <h1>送到啦</h1>
        <p class="lead">${ANIMAL_META[placed.animalId].name}走进主机世界了。你不用走进那片大地图。</p>
        <img class="sent-thumb" alt="" src="${thumb}" />
        <button class="hit kid-hit" data-act="again" type="button">再画一只</button>
      </main>`
    this.root.querySelector('[data-act="again"]')?.addEventListener('click', () => this.go({ name: 'pick', roomId }))
  }

  private setMsg(id: string, text: string, kind: 'ok' | 'err' | '' = ''): void {
    const msg = this.root.querySelector(`#${id}`)
    if (!msg) return
    msg.textContent = text
    msg.classList.toggle('is-error', kind === 'err')
    msg.classList.toggle('is-ok', kind === 'ok')
  }

  private persistDraft(roomId: string, animalId: AnimalId): void {
    if (!this.paint) return
    this.setMsg('paint-msg', '正在保存草稿…')
    try {
      saveDraft({
        roomId,
        animalId,
        colorPng: this.paint.colorDataURL(),
        savedAt: Date.now(),
      })
      this.setMsg('paint-msg', '草稿收好了。下次打开这只动物会接着涂。', 'ok')
    } catch {
      this.setMsg('paint-msg', '草稿没保存上，再试一次。', 'err')
    }
  }

  private async restoreDraft(roomId: string, animalId: AnimalId): Promise<void> {
    const mask = this.root.querySelector('#paint-load')
    const draft = loadDraft(roomId, animalId)
    if (!draft) {
      mask?.remove()
      this.setMsg('paint-msg', '空白画纸。点色块就能涂。')
      return
    }
    if (!this.paint) return
    try {
      await this.paint.restoreColor(draft.colorPng)
      this.setMsg('paint-msg', '已恢复草稿。可以接着涂，或点保存草稿。', 'ok')
    } catch {
      this.setMsg('paint-msg', '草稿打不开，给你一张新画纸。', 'err')
    } finally {
      mask?.remove()
    }
  }

  private async send(roomId: string, animalId: AnimalId): Promise<void> {
    if (!this.paint) return
    const btn = this.root.querySelector<HTMLButtonElement>('[data-act="send"]')
    if (btn) btn.disabled = true
    this.setMsg('paint-msg', '正在送…')
    const result = await sendToWorld({ roomId, animalId, paint: this.paint })
    if (!result.ok) {
      const reasons = { missing: '展览结束啦', paused: '等一等再送', full: '有点挤，等一等' }
      this.setMsg('paint-msg', reasons[result.reason], 'err')
      if (btn) btn.disabled = false
      return
    }
    this.go({ name: 'success', roomId, placed: result.placed, thumb: result.item.thumb })
  }

  private setScanMsg(text: string, kind: 'ok' | 'err' | '' = ''): void {
    this.setMsg('scan-msg', text, kind)
  }

  private async startCamera(): Promise<void> {
    this.setScanMsg('正在打开摄像头…')
    if (!navigator.mediaDevices?.getUserMedia) {
      this.setScanMsg('这个电脑没有摄像头接口。请点「选一张二维码图片」。', 'err')
      return
    }
    try {
      this.stopCamera()
      this.media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
    } catch {
      this.setScanMsg('摄像头被挡住了。云桌面常常这样：请点「选一张二维码图片」。', 'err')
      return
    }
    const video = this.root.querySelector<HTMLVideoElement>('#scan-video')
    if (!video) return
    video.srcObject = this.media
    await video.play().catch(() => undefined)
    this.setScanMsg('把二维码放进画面里…')
    const tick = async (): Promise<void> => {
      if (!this.media) return
      if (video.readyState >= 2 && video.videoWidth) {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0)
          try {
            const text = await decodeQrFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height))
            if (text) {
              this.joinFromText(text)
              return
            }
          } catch {
            /* keep scanning */
          }
        }
      }
      this.scanRaf = requestAnimationFrame(() => {
        void tick()
      })
    }
    this.scanRaf = requestAnimationFrame(() => {
      void tick()
    })
  }

  private async joinFromFile(file: File): Promise<void> {
    this.setScanMsg('正在认这张图…')
    try {
      const text = await decodeQrFromFile(file)
      if (!text) {
        this.setScanMsg('没认出二维码。换一张更清楚的图，或把主机码截图再试。', 'err')
        return
      }
      this.joinFromText(text)
    } catch {
      this.setScanMsg('图片打不开。再选一次。', 'err')
    }
  }

  private joinFromText(text: string): void {
    const roomId = parseJoinFromQr(text)
    if (!roomId) {
      this.setScanMsg('这不是房间码。请扫老师主机上的码。', 'err')
      return
    }
    this.stopCamera()
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
    this.setScanMsg('扫到啦，正在进入…', 'ok')
    this.go({ name: 'pick', roomId })
  }
}
