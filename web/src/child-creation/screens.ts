/**
 * 儿童创作用例界面：选一只 → 自由蜡笔涂色 → 送进世界。
 * 网页预览可直接涂；扫码进老师的房。送到后可去看大世界。
 */
import { createRoom, ensurePreviewRoom, getRoom } from '../sync'
import { storage } from '../storage'
import type { AnimalId, PlacedAnimal } from '../types'
import { ANIMAL_META, LAND_IDS, MARINE_IDS, PALETTE, ROOM_CAP } from '../types'
import { PreviewStage } from '../world-exhibition/preview'
import {
  emptySlotCount,
  getDraft,
  listDrafts,
  MAX_DRAFTS,
  replaceDraft,
  saveDraft,
  type PaintDraft,
} from './drafts'
import { inferAnimalId, needsAnimalPicker } from './infer-animal'
import { drawPreview } from './lineart'
import { BRUSH_SIZES, PaintSurface } from './paint'
import { decodeQrFromFile, decodeQrFromImageData, parseJoinFromQr } from './scan-qr'
import { sendToWorld } from './send-to-world'

export type ChildGo =
  | { name: 'home' }
  | { name: 'host'; roomId: string }
  | { name: 'need-scan' }
  | { name: 'scan' }
  | { name: 'drafts' }
  | { name: 'replace-draft' }
  | { name: 'pick'; roomId: string }
  | { name: 'paint'; roomId: string; animalId: AnimalId; draftId?: string }
  | { name: 'success'; roomId: string; placed: PlacedAnimal; thumb: string }
  | { name: 'ended' }

export class ChildCreation {
  private paint: PaintSurface | null = null
  private worldPreview: PreviewStage | null = null
  private root: HTMLElement
  private go: (s: ChildGo) => void
  private media: MediaStream | null = null
  private scanRaf = 0
  private openDraftId: string | null = null
  private pendingSave: {
    roomId: string
    animalId: AnimalId
    colorPng: string
    thumb: string
  } | null = null

  constructor(root: HTMLElement, go: (s: ChildGo) => void) {
    this.root = root
    this.go = go
  }

  dispose(): void {
    this.paint = null
    this.worldPreview?.dispose()
    this.worldPreview = null
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
        <p class="lead">陆地上的送进小路，海里的送进大海。点一张大卡片就开始涂。</p>
        <p class="pick-section">陆地上</p>
        <div class="pick-grid" id="picks-land"></div>
        <p class="pick-section">海里</p>
        <div class="pick-grid" id="picks-sea"></div>
      </main>`
    this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => this.go({ name: 'home' }))
    this.fillPicks(this.root.querySelector('#picks-land'), LAND_IDS, roomId)
    this.fillPicks(this.root.querySelector('#picks-sea'), MARINE_IDS, roomId)
  }

  private fillPicks(grid: Element | null, ids: readonly AnimalId[], roomId: string): void {
    if (!grid) return
    for (const id of ids) {
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
      card.addEventListener('click', () => this.go({ name: 'paint', roomId, animalId: id }))
      grid.append(card)
    }
  }

  paintScreen(roomId: string, animalId: AnimalId, draftId?: string): void {
    this.openDraftId = draftId || null
    this.paint = new PaintSurface(animalId, () => undefined)
    this.paint.tool = 'brush'
    this.paint.brush = 36
    this.paint.colorHex = PALETTE[3]!.hex
    this.root.innerHTML = `
      <main class="page paint-page">
        <div class="paint-bar">
          <button class="hit kid-hit" data-act="pick" type="button">重选动物</button>
          <button class="hit draft-hit" data-act="draft" type="button">保存草稿</button>
          <button class="hit scan-file-hit" data-act="drafts" type="button">我的草稿</button>
        </div>
        <p class="lead paint-hint">正在画${ANIMAL_META[animalId].name}。拿蜡笔在纸上随便涂，线只是样子。</p>
        <div class="paint-body" id="paint-body">
          <div class="loading-mask" id="paint-load">正在打开画纸…</div>
        </div>
        <div class="brush-row" id="brush-sizes"></div>
        <div class="crayons" id="crayons"></div>
        <button class="send-hit" data-act="send" type="button">送进世界</button>
        <p class="paint-msg" id="paint-msg">拿蜡笔在纸上随便涂。不用点满色块。</p>
        <div class="animal-picker" id="animal-picker" hidden>
          <p class="lead">这是哪只？点一张就送出去。</p>
          <div class="pick-grid picker-row" id="picker-row"></div>
        </div>
      </main>`
    this.root.querySelector('#paint-body')?.append(this.paint.wrap)
    const sizes = this.root.querySelector('#brush-sizes')
    BRUSH_SIZES.forEach((s) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = `brush-size ${s.id === 36 ? 'on' : ''}`
      b.textContent = s.name
      b.addEventListener('click', () => {
        if (!this.paint) return
        this.paint.brush = s.id
        this.paint.tool = 'brush'
        sizes?.querySelectorAll('.brush-size').forEach((el) => el.classList.remove('on'))
        b.classList.add('on')
        this.root.querySelector('[data-act="eraser"]')?.classList.remove('on')
      })
      sizes?.append(b)
    })
    const eraser = document.createElement('button')
    eraser.type = 'button'
    eraser.className = 'brush-size eraser-hit'
    eraser.dataset.act = 'eraser'
    eraser.textContent = '橡皮'
    eraser.addEventListener('click', () => {
      if (!this.paint) return
      this.paint.tool = this.paint.tool === 'eraser' ? 'brush' : 'eraser'
      eraser.classList.toggle('on', this.paint.tool === 'eraser')
    })
    sizes?.append(eraser)
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
        this.paint.tool = 'brush'
        crayons?.querySelectorAll('.crayon').forEach((el) => el.classList.remove('on'))
        b.classList.add('on')
        this.root.querySelector('[data-act="eraser"]')?.classList.remove('on')
      })
      crayons?.append(b)
    })
    this.root.querySelector('[data-act="pick"]')?.addEventListener('click', () => this.go({ name: 'pick', roomId }))
    this.root.querySelector('[data-act="draft"]')?.addEventListener('click', () => this.persistDraft(roomId, animalId))
    this.root.querySelector('[data-act="drafts"]')?.addEventListener('click', () => this.go({ name: 'drafts' }))
    this.root.querySelector('[data-act="send"]')?.addEventListener('click', () => {
      void this.send(roomId, animalId)
    })
    void this.restoreDraft(draftId)
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
        <button class="hit kid-hit" data-act="again" type="button">再画一只</button>
      </main>`
    this.root.querySelector('[data-act="world"]')?.addEventListener('click', () =>
      this.go({ name: 'host', roomId }),
    )
    this.root.querySelector('[data-act="again"]')?.addEventListener('click', () => this.go({ name: 'pick', roomId }))
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
    const payload = {
      id: this.openDraftId || undefined,
      roomId,
      animalId,
      colorPng: this.paint.colorDataURL(),
      thumb: this.paint.thumb(),
    }
    try {
      const result = saveDraft(payload)
      if (!result.ok) {
        this.pendingSave = payload
        this.go({ name: 'replace-draft' })
        return
      }
      this.openDraftId = result.draft.id
      this.setMsg('paint-msg', `草稿收好了。${result.count}/${MAX_DRAFTS} 格。`, 'ok')
    } catch {
      this.setMsg('paint-msg', '草稿没保存上，再试一次。', 'err')
    }
  }

  private async restoreDraft(draftId?: string): Promise<void> {
    const mask = this.root.querySelector('#paint-load')
    const pending = this.pendingSave
    if (!draftId && pending && this.paint) {
      try {
        await this.paint.restoreColor(pending.colorPng)
        this.setMsg('paint-msg', '格子还是满的。再点「保存草稿」换一张旧的。', 'err')
      } catch {
        this.setMsg('paint-msg', '画纸打不开。', 'err')
      } finally {
        mask?.remove()
      }
      return
    }
    if (!draftId) {
      mask?.remove()
      this.setMsg('paint-msg', '空白画纸。拿蜡笔在纸上随便涂。')
      return
    }
    const draft = getDraft(draftId)
    if (!draft) {
      mask?.remove()
      this.setMsg('paint-msg', '这张草稿找不到了，给你一张新画纸。', 'err')
      this.openDraftId = null
      return
    }
    if (!this.paint) return
    try {
      await this.paint.restoreColor(draft.colorPng)
      this.openDraftId = draft.id
      this.setMsg('paint-msg', '已打开这张草稿。可以接着涂。', 'ok')
    } catch {
      this.setMsg('paint-msg', '草稿打不开，给你一张新画纸。', 'err')
      this.openDraftId = null
    } finally {
      mask?.remove()
    }
  }

  showDrafts(): void {
    this.root.innerHTML = `
      <main class="page kid">
        <button class="hit kid-hit" data-act="home" type="button">回首页</button>
        <h1>我的草稿</h1>
        <p class="lead" id="drafts-lead">正在打开草稿…</p>
        <div class="draft-grid" id="draft-grid"></div>
      </main>`
    this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => this.go({ name: 'home' }))
    const lead = this.root.querySelector('#drafts-lead')
    const grid = this.root.querySelector('#draft-grid')
    const listed = listDrafts()
    if (!listed.ok) {
      if (lead) lead.textContent = '草稿打不开。再进一次试试。'
      grid?.insertAdjacentHTML(
        'beforeend',
        `<div class="banner error"><p>格子里的画读不出来。</p></div>`,
      )
      return
    }
    const drafts = listed.drafts
    const empty = emptySlotCount(drafts)
    if (lead) {
      lead.textContent = drafts.length
        ? `一共 ${MAX_DRAFTS} 格，用了 ${drafts.length} 格，还空 ${empty} 格。点一张接着涂。`
        : '还没有草稿。去涂一只，再点「保存草稿」。'
    }
    if (!drafts.length) {
      grid?.insertAdjacentHTML(
        'beforeend',
        `<div class="empty"><p>格子是空的。回首页点「开始画画」，涂完按黄色的「保存草稿」。</p></div>`,
      )
    }
    drafts.forEach((d, i) => grid?.append(this.draftCard(d, i + 1, 'open')))
    for (let i = 0; i < empty; i++) {
      const slot = document.createElement('div')
      slot.className = 'draft-card empty-slot'
      slot.innerHTML = `<span>空</span><strong>第 ${drafts.length + i + 1} 格</strong>`
      grid?.append(slot)
    }
  }

  showReplaceDraft(): void {
    const pending = this.pendingSave
    this.root.innerHTML = `
      <main class="page kid">
        <button class="hit kid-hit" data-act="back" type="button">再想想</button>
        <h1>格子满了</h1>
        <p class="lead">已经有 ${MAX_DRAFTS} 张草稿。点一张旧的换成现在这张。不用输数字。</p>
        <div class="draft-grid" id="draft-grid"></div>
        <p class="paint-msg is-error" id="replace-msg"></p>
      </main>`
    this.root.querySelector('[data-act="back"]')?.addEventListener('click', () => {
      if (pending) this.go({ name: 'paint', roomId: pending.roomId, animalId: pending.animalId })
      else this.go({ name: 'drafts' })
    })
    const listed = listDrafts()
    const grid = this.root.querySelector('#draft-grid')
    if (!listed.ok) {
      this.setMsg('replace-msg', '草稿打不开，过一会儿再试。', 'err')
      return
    }
    if (!pending) {
      this.setMsg('replace-msg', '没有要保存的画。', 'err')
      return
    }
    listed.drafts.forEach((d, i) => grid?.append(this.draftCard(d, i + 1, 'replace')))
  }

  private draftCard(draft: PaintDraft, slot: number, mode: 'open' | 'replace'): HTMLButtonElement {
    const card = document.createElement('button')
    card.type = 'button'
    card.className = 'draft-card'
    card.innerHTML = `
      <img alt="" src="${draft.thumb || draft.colorPng}" />
      <strong>${ANIMAL_META[draft.animalId].name}</strong>
      <span>第 ${slot} 格 · ${whenLabel(draft.savedAt)}</span>`
    card.addEventListener('click', () => {
      if (mode === 'replace') this.applyReplace(draft.id)
      else this.openDraft(draft)
    })
    return card
  }

  private applyReplace(id: string): void {
    const pending = this.pendingSave
    if (!pending) return
    const draft = replaceDraft(id, pending)
    if (!draft) {
      this.setMsg('replace-msg', '没换上，再点一次。', 'err')
      return
    }
    this.pendingSave = null
    this.openDraftId = draft.id
    this.go({ name: 'paint', roomId: draft.roomId, animalId: draft.animalId, draftId: draft.id })
  }

  private openDraft(draft: PaintDraft): void {
    const roomId = getRoom(draft.roomId)?.id || ensurePreviewRoom()
    if (!getRoom(roomId)) {
      const id = ensurePreviewRoom()
      void storage.createRoom({
        code: id,
        theme: 'forest',
        paused: false,
        ended: false,
        hostAliveAt: Date.now(),
        cap: ROOM_CAP,
      })
      this.go({ name: 'paint', roomId: id, animalId: draft.animalId, draftId: draft.id })
      return
    }
    this.go({ name: 'paint', roomId, animalId: draft.animalId, draftId: draft.id })
  }

  private async send(roomId: string, animalId: AnimalId): Promise<void> {
    if (!this.paint) return
    const inferred = inferAnimalId({
      startedAs: animalId,
      averageHex: this.paint.averagePaintHex(),
    })
    if (needsAnimalPicker(inferred) && !animalId) {
      this.showSendPicker(roomId)
      return
    }
    await this.finishSend(roomId, inferred.animalId)
  }

  private showSendPicker(roomId: string): void {
    const box = this.root.querySelector<HTMLElement>('#animal-picker')
    const row = this.root.querySelector('#picker-row')
    if (!box || !row) return
    box.hidden = false
    row.innerHTML = ''
    this.setMsg('paint-msg', '先点一下这是哪只，再送出去。')
    ;([...LAND_IDS, ...MARINE_IDS] as AnimalId[]).forEach((id) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'hit kid-hit'
      b.textContent = ANIMAL_META[id].name
      b.addEventListener('click', () => {
        void this.finishSend(roomId, id)
      })
      row.append(b)
    })
  }

  private async finishSend(roomId: string, animalId: AnimalId): Promise<void> {
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

function whenLabel(at: number): string {
  const diff = Date.now() - at
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return '刚才'
  const d = new Date(at)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
