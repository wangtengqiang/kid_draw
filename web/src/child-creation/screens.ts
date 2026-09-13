/**
 * 儿童创作用例界面：输入房号 / 扫码 → 选一只 → 涂色 → 送进世界。
 * 不换主题、不进主机森林。3D 转台在观展层打开。
 */
import type { GalleryItem } from '../types'
import { getRoom } from '../sync'
import type { AnimalId, PlacedAnimal } from '../types'
import { ANIMAL_IDS, ANIMAL_META, PALETTE } from '../types'
import { drawPreview } from './lineart'
import { PaintSurface } from './paint'
import { sendToWorld } from './send-to-world'

export type ChildGo =
  | { name: 'home' }
  | { name: 'join'; error?: string }
  | { name: 'pick'; roomId: string }
  | { name: 'paint'; roomId: string; animalId: AnimalId }
  | { name: 'success'; roomId: string; placed: PlacedAnimal; thumb: string }
  | { name: 'ended' }
  | { name: 'gallery' }
  | { name: 'preview'; item: GalleryItem }

export class ChildCreation {
  private paint: PaintSurface | null = null
  private root: HTMLElement
  private go: (s: ChildGo) => void

  constructor(root: HTMLElement, go: (s: ChildGo) => void) {
    this.root = root
    this.go = go
  }

  dispose(): void {
    this.paint = null
  }

  join(error?: string): void {
    this.root.innerHTML = `
      <main class="page kid">
        <button class="back" data-act="home" type="button">返回</button>
        <h1>加入展览</h1>
        <p class="lead">输入主机上的 4 位号码，或打开带 ?join=号码 的链接（等于扫码）。</p>
        ${error ? `<p class="banner error">${escapeHtml(error)}</p>` : ''}
        <input class="code-input" inputmode="numeric" maxlength="4" placeholder="0000" aria-label="房间号" />
        <button class="hit kid-hit" data-act="go" type="button">开始涂色</button>
      </main>`
    const input = this.root.querySelector('input')
    const tryJoin = () => {
      const code = (input?.value || '').trim()
      if (!/^\d{4}$/.test(code)) {
        this.go({ name: 'join', error: '请输入 4 位数字房间号。' })
        return
      }
      if (!getRoom(code)) {
        this.go({ name: 'join', error: '找不到这场展览，问问主持人身边的号码吧。' })
        return
      }
      history.replaceState({}, '', `?join=${code}`)
      this.go({ name: 'pick', roomId: code })
    }
    this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => this.go({ name: 'home' }))
    this.root.querySelector('[data-act="go"]')?.addEventListener('click', tryJoin)
    input?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') tryJoin()
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
        <button class="back" data-act="back" type="button">返回</button>
        <h1>选一只</h1>
        <p class="lead">房间 ${escapeHtml(roomId)} · 点一张大卡片就开始涂。线稿锁住了。</p>
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
      card.addEventListener('click', () => this.go({ name: 'paint', roomId, animalId: id }))
      grid?.append(card)
    }
    this.root.querySelector('[data-act="back"]')?.addEventListener('click', () => this.go({ name: 'join' }))
  }

  paintScreen(roomId: string, animalId: AnimalId): void {
    this.paint = new PaintSurface(animalId, () => undefined)
    this.paint.brush = 36
    this.paint.colorHex = PALETTE[3]!.hex
    this.root.innerHTML = `
      <main class="page paint-page">
        <button class="back" data-act="pick" type="button">重选动物</button>
        <div class="paint-body" id="paint-body"></div>
        <div class="tools-row">
          <button class="tool on" data-tool="fill" type="button">填色</button>
          <button class="tool" data-tool="brush" type="button">蜡笔</button>
          <button class="tool" data-tool="eraser" type="button">橡皮</button>
          <button class="tool" data-act="undo" type="button">撤销</button>
        </div>
        <div class="crayons" id="crayons"></div>
        <button class="send-hit" data-act="send" type="button">送进世界</button>
        <p class="paint-msg" id="paint-msg"></p>
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
    this.root.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.paint) return
        this.paint.tool = btn.dataset.tool as 'brush' | 'fill' | 'eraser'
        this.root.querySelectorAll('[data-tool]').forEach((el) => el.classList.toggle('on', el === btn))
      })
    })
    this.root.querySelector('[data-act="undo"]')?.addEventListener('click', () => this.paint?.undo())
    this.root.querySelector('[data-act="pick"]')?.addEventListener('click', () => this.go({ name: 'pick', roomId }))
    this.root.querySelector('[data-act="send"]')?.addEventListener('click', () => {
      void this.send(roomId, animalId)
    })
  }

  success(roomId: string, placed: PlacedAnimal, thumb: string): void {
    this.root.innerHTML = `
      <main class="page kid">
        <h1>送到啦</h1>
        <p class="lead">${ANIMAL_META[placed.animalId].name}走进主机世界了。你不用走进那片大地图。</p>
        <img class="sent-thumb" alt="" src="${thumb}" />
        <button class="hit kid-hit" data-act="preview" type="button">看立体模型</button>
        <button class="hit host-hit" data-act="again" type="button">再画一只</button>
        <button class="text-link" data-act="gallery" type="button">全部作品</button>
      </main>`
    this.root.querySelector('[data-act="again"]')?.addEventListener('click', () => this.go({ name: 'pick', roomId }))
    this.root.querySelector('[data-act="gallery"]')?.addEventListener('click', () => this.go({ name: 'gallery' }))
    this.root.querySelector('[data-act="preview"]')?.addEventListener('click', () =>
      this.go({
        name: 'preview',
        item: {
          id: placed.id,
          animalId: placed.animalId,
          thumb,
          regionColors: placed.regionColors,
          roomId,
          createdAt: placed.createdAt,
        },
      }),
    )
  }

  private async send(roomId: string, animalId: AnimalId): Promise<void> {
    if (!this.paint) return
    const msg = this.root.querySelector('#paint-msg')
    const btn = this.root.querySelector<HTMLButtonElement>('[data-act="send"]')
    if (btn) btn.disabled = true
    if (msg) msg.textContent = '画还在安检，马上送进去…'
    const result = await sendToWorld({ roomId, animalId, paint: this.paint })
    if (!result.ok) {
      const reasons: Record<'missing' | 'paused' | 'full', string> = {
        missing: '找不到这场展览，或已经结束啦。',
        paused: '主持人暂时停收画了，等一会儿再送。',
        full: '有点挤，等一等或请主持人清场。',
      }
      if (msg) msg.textContent = reasons[result.reason]
      if (btn) btn.disabled = false
      return
    }
    this.go({ name: 'success', roomId, placed: result.placed, thumb: result.item.thumb })
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
}
