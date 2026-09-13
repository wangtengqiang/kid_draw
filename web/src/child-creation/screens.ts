/**
 * 儿童创作用例界面：选一只 → 大蜡笔涂色 → 送进世界。
 * 扫码（?join=房号）进来不输数字。不换主题、不进主机森林、不打开 3D 预览。
 * 「我的画」和大缩略图、转台在 world-exhibition/，这里不渲染。
 */
import { getRoom } from '../sync'
import type { AnimalId, PlacedAnimal } from '../types'
import { ANIMAL_IDS, ANIMAL_META, PALETTE } from '../types'
import { drawPreview } from './lineart'
import { PaintSurface } from './paint'
import { sendToWorld } from './send-to-world'

export type ChildGo =
  | { name: 'home' }
  | { name: 'need-scan' }
  | { name: 'pick'; roomId: string }
  | { name: 'paint'; roomId: string; animalId: AnimalId }
  | { name: 'success'; roomId: string; placed: PlacedAnimal; thumb: string }
  | { name: 'ended' }

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

  needScan(): void {
    this.root.innerHTML = `
      <main class="page kid">
        <button class="back" data-act="home" type="button">返回</button>
        <h1>请扫老师的码</h1>
        <p class="lead">扫完就能画画。不用输入数字。</p>
      </main>`
    this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => this.go({ name: 'home' }))
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
        <h1>选一只</h1>
        <p class="lead">点一张大卡片就开始涂。</p>
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
  }

  paintScreen(roomId: string, animalId: AnimalId): void {
    this.paint = new PaintSurface(animalId, () => undefined)
    this.paint.brush = 36
    this.paint.colorHex = PALETTE[3]!.hex
    this.root.innerHTML = `
      <main class="page paint-page">
        <button class="back" data-act="pick" type="button">重选动物</button>
        <div class="paint-body" id="paint-body"></div>
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
        <button class="hit kid-hit" data-act="again" type="button">再画一只</button>
      </main>`
    this.root.querySelector('[data-act="again"]')?.addEventListener('click', () => this.go({ name: 'pick', roomId }))
  }

  private async send(roomId: string, animalId: AnimalId): Promise<void> {
    if (!this.paint) return
    const msg = this.root.querySelector('#paint-msg')
    const btn = this.root.querySelector<HTMLButtonElement>('[data-act="send"]')
    if (btn) btn.disabled = true
    if (msg) msg.textContent = '正在送…'
    const result = await sendToWorld({ roomId, animalId, paint: this.paint })
    if (!result.ok) {
      const reasons = { missing: '展览结束啦', paused: '等一等再送', full: '有点挤，等一等' }
      if (msg) msg.textContent = reasons[result.reason]
      if (btn) btn.disabled = false
      return
    }
    this.go({ name: 'success', roomId, placed: result.placed, thumb: result.item.thumb })
  }
}
