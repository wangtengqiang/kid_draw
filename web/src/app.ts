import QRCode from 'qrcode'
import type { AnimalId, GalleryItem, PlacedAnimal, ThemeId } from './types'
import { ANIMAL_META, PALETTE, THEME_META } from './types'
import {
  animalLabel,
  clearAnimals,
  createRoom,
  creatorId,
  creatorJoinUrl,
  endRoom,
  getRoom,
  isHostQuery,
  joinQuery,
  loadGallery,
  newRoomCode,
  onSync,
  patchRoom,
  saveGalleryItem,
  setTheme,
  submitAnimal,
  touchHost,
} from './state'
import { PaintSurface } from './paint'
import { drawPreview } from './animals2d'
import { HostWorld } from './world'
import { PreviewStage } from './preview'
import { storage } from './storage'

type Screen =
  | { name: 'home' }
  | { name: 'host'; roomId: string }
  | { name: 'need-scan' }
  | { name: 'pick'; roomId: string }
  | { name: 'paint'; roomId: string; animalId: AnimalId }
  | { name: 'success'; roomId: string; placed: PlacedAnimal }
  | { name: 'gallery' }
  | { name: 'preview'; item: GalleryItem }

const appRoot = document.querySelector<HTMLDivElement>('#app')
if (!appRoot) throw new Error('missing #app')
const root: HTMLDivElement = appRoot

let screen: Screen = { name: 'home' }
let world: HostWorld | null = null
let preview: PreviewStage | null = null
let paint: PaintSurface | null = null
let hostTimer = 0
let stopSync: (() => void) | null = null

function go(next: Screen): void {
  world?.dispose()
  world = null
  preview?.dispose()
  preview = null
  paint = null
  if (hostTimer) window.clearInterval(hostTimer)
  stopSync?.()
  stopSync = null
  screen = next
  render()
}

function render(): void {
  if (screen.name === 'home') renderHome()
  else if (screen.name === 'host') renderHost(screen.roomId)
  else if (screen.name === 'need-scan') renderNeedScan()
  else if (screen.name === 'pick') renderPick(screen.roomId)
  else if (screen.name === 'paint') renderPaint(screen.roomId, screen.animalId)
  else if (screen.name === 'success') renderSuccess(screen.roomId, screen.placed)
  else if (screen.name === 'gallery') renderGallery()
  else renderItemPreview(screen.item)
}

function renderHome(): void {
  root.innerHTML = `
    <main class="page home">
      <h1>彩绘动物</h1>
      <p class="lead">涂好，送进世界。</p>
      <button class="hit host-hit" data-act="host" type="button">打开世界</button>
      <button class="hit kid-hit" data-act="draw" type="button">开始画画</button>
      <button class="text-link" data-act="gallery" type="button">我的画</button>
    </main>`
  root.querySelector('[data-act="host"]')?.addEventListener('click', () => {
    const id = newRoomCode()
    createRoom(id)
    void storage.createRoom({
      code: id,
      theme: 'forest',
      paused: false,
      ended: false,
      hostAliveAt: Date.now(),
      cap: 8,
    })
    history.replaceState({}, '', `?host=1&room=${id}`)
    go({ name: 'host', roomId: id })
  })
  root.querySelector('[data-act="draw"]')?.addEventListener('click', () => {
    const join = joinQuery()
    if (join && getRoom(join)) {
      history.replaceState({}, '', `?join=${join}`)
      go({ name: 'pick', roomId: join })
      return
    }
    go({ name: 'need-scan' })
  })
  root.querySelector('[data-act="gallery"]')?.addEventListener('click', () => go({ name: 'gallery' }))
}

function renderNeedScan(): void {
  root.innerHTML = `
    <main class="page kid">
      <button class="back" data-act="home" type="button">返回</button>
      <h1>请扫老师的码</h1>
      <p class="lead">扫完就能画画。不用输入数字。</p>
    </main>`
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => go({ name: 'home' }))
}

function renderHost(roomId: string): void {
  const room = getRoom(roomId) ?? createRoom(roomId)
  root.innerHTML = `
    <div class="host-layout">
      <div class="world-pane">
        <canvas id="world-canvas"></canvas>
        <p class="world-empty" id="world-empty">等小朋友把动物送进来</p>
      </div>
      <aside class="host-panel">
        <button class="back" data-act="home" type="button">返回</button>
        <p class="room-code">${roomId}</p>
        <img class="qr" id="qr" alt="房间码" />
        <div class="theme-row" id="themes"></div>
        <div class="host-more">
          <button type="button" data-act="pause">${room.paused ? '继续收画' : '暂停收画'}</button>
          <button type="button" data-act="clear">清场</button>
          <button type="button" data-act="end">结束</button>
        </div>
      </aside>
    </div>`
  const canvas = root.querySelector<HTMLCanvasElement>('#world-canvas')
  if (!canvas) return
  world = new HostWorld(canvas)
  world.applyTheme(room.theme)
  world.syncAnimals(room.animals)
  const qr = root.querySelector<HTMLImageElement>('#qr')
  if (qr) {
    QRCode.toDataURL(creatorJoinUrl(roomId), {
      margin: 1,
      width: 320,
      color: { dark: '#1a120c', light: '#fffaf1' },
    })
      .then((url) => {
        qr.src = url
      })
      .catch(() => undefined)
  }
  const themes = root.querySelector('#themes')
  if (themes) {
    themes.innerHTML = (['forest', 'snow', 'underwater'] as ThemeId[])
      .map(
        (id) =>
          `<button type="button" class="theme-btn ${id === room.theme ? 'on' : ''}" data-theme="${id}">${THEME_META[id].emoji}<span>${THEME_META[id].name}</span></button>`,
      )
      .join('')
    themes.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme as ThemeId
        setTheme(roomId, theme)
        void storage.updateRoomMeta(roomId, { theme })
        world?.applyTheme(theme)
        refreshHost(roomId)
      })
    })
  }
  root.querySelector('[data-act="home"]')?.addEventListener('click', () => {
    history.replaceState({}, '', '/')
    go({ name: 'home' })
  })
  root.querySelector('[data-act="pause"]')?.addEventListener('click', () => {
    const cur = getRoom(roomId)
    patchRoom(roomId, { paused: !cur?.paused })
    refreshHost(roomId)
  })
  root.querySelector('[data-act="clear"]')?.addEventListener('click', () => {
    clearAnimals(roomId)
    void storage.clearRoomAnimals(roomId)
    world?.syncAnimals([])
    refreshHost(roomId)
  })
  root.querySelector('[data-act="end"]')?.addEventListener('click', () => {
    endRoom(roomId)
    void storage.updateRoomMeta(roomId, { ended: true })
    history.replaceState({}, '', '/')
    go({ name: 'home' })
  })
  const tick = () => {
    touchHost(roomId)
    const cur = getRoom(roomId)
    if (!cur) return
    world?.syncAnimals(cur.animals)
    refreshHost(roomId)
  }
  tick()
  hostTimer = window.setInterval(tick, 900)
  stopSync = onSync(tick)
}

function refreshHost(roomId: string): void {
  const room = getRoom(roomId)
  const empty = root.querySelector('#world-empty')
  const pauseBtn = root.querySelector('[data-act="pause"]')
  if (!room) return
  if (empty) empty.textContent = room.animals.length ? '' : '等小朋友把动物送进来'
  if (pauseBtn) pauseBtn.textContent = room.paused ? '继续收画' : '暂停收画'
  root.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach((btn) => {
    btn.classList.toggle('on', btn.dataset.theme === room.theme)
  })
}

function renderPick(roomId: string): void {
  if (!getRoom(roomId)) {
    root.innerHTML = `<main class="page kid"><h1>展览结束啦</h1><button class="hit" data-act="home" type="button">好</button></main>`
    root.querySelector('[data-act="home"]')?.addEventListener('click', () => go({ name: 'home' }))
    return
  }
  root.innerHTML = `
    <main class="page kid">
      <h1>选一只</h1>
      <div class="pick-grid" id="picks"></div>
      <button class="text-link" data-act="gallery" type="button">我的画</button>
    </main>`
  const grid = root.querySelector('#picks')
  ;(['deer', 'tiger', 'lion'] as AnimalId[]).forEach((id) => {
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
    card.addEventListener('click', () => go({ name: 'paint', roomId, animalId: id }))
    grid?.append(card)
  })
  root.querySelector('[data-act="gallery"]')?.addEventListener('click', () => go({ name: 'gallery' }))
}

function renderPaint(roomId: string, animalId: AnimalId): void {
  paint = new PaintSurface(animalId, () => undefined)
  paint.tool = 'fill'
  paint.brush = 36
  paint.colorHex = PALETTE[3].hex
  root.innerHTML = `
    <main class="page paint-page">
      <div class="paint-body" id="paint-body"></div>
      <div class="crayons" id="crayons"></div>
      <button class="send-hit" data-act="send" type="button">送进世界</button>
      <p class="paint-msg" id="paint-msg"></p>
    </main>`
  root.querySelector('#paint-body')?.append(paint.wrap)
  const crayons = root.querySelector('#crayons')
  PALETTE.forEach((c, i) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = `crayon ${i === 3 ? 'on' : ''}`
    b.style.background = c.hex
    b.setAttribute('aria-label', c.name)
    b.addEventListener('click', () => {
      if (!paint) return
      paint.colorHex = c.hex
      crayons?.querySelectorAll('.crayon').forEach((el) => el.classList.remove('on'))
      b.classList.add('on')
    })
    crayons?.append(b)
  })
  root.querySelector('[data-act="send"]')?.addEventListener('click', () => {
    void sendPainting(roomId, animalId)
  })
}

async function sendPainting(roomId: string, animalId: AnimalId): Promise<void> {
  if (!paint) return
  const msg = root.querySelector('#paint-msg')
  const sendBtn = root.querySelector<HTMLButtonElement>('[data-act="send"]')
  if (sendBtn) sendBtn.disabled = true
  if (msg) msg.textContent = '正在送…'
  const thumb = paint.thumb()
  const regionColors = paint.sampleRegions()
  const tex = await storage.putTexture(thumb, `${animalId}-${Date.now()}`)
  const item: GalleryItem = {
    id: `g-${Date.now()}`,
    animalId,
    thumb: tex.url,
    regionColors,
    roomId,
    createdAt: Date.now(),
  }
  saveGalleryItem(item)
  await storage.saveGalleryItem({
    id: item.id,
    creatorId: creatorId(),
    animalId,
    texture: tex,
    thumb: tex,
    regionColors,
    roomCode: roomId,
    createdAt: item.createdAt,
  })
  const result = submitAnimal(roomId, {
    animalId,
    creatorId: creatorId(),
    label: animalLabel(animalId),
    thumb: tex.url,
    regionColors,
  })
  if (!result.ok) {
    const reasons = {
      missing: '展览结束啦',
      paused: '等一等再送',
      full: '有点挤，等一等',
    }
    if (msg) msg.textContent = reasons[result.reason]
    if (sendBtn) sendBtn.disabled = false
    return
  }
  await storage.addRoomAnimal({
    id: result.placed.id,
    roomCode: roomId,
    creatorId: creatorId(),
    animalId,
    label: result.placed.label,
    texture: tex,
    regionColors,
    createdAt: result.placed.createdAt,
  })
  go({ name: 'success', roomId, placed: result.placed })
}

function renderSuccess(roomId: string, placed: PlacedAnimal): void {
  root.innerHTML = `
    <main class="page kid">
      <h1>送到啦</h1>
      <div class="preview-frame">
        <canvas id="preview-canvas"></canvas>
      </div>
      <button class="hit kid-hit" data-act="again" type="button">再画一只</button>
      <button class="text-link" data-act="gallery" type="button">我的画</button>
    </main>`
  const canvas = root.querySelector<HTMLCanvasElement>('#preview-canvas')
  if (canvas) {
    preview = new PreviewStage(canvas)
    preview.show(placed.animalId, placed.regionColors)
  }
  root.querySelector('[data-act="again"]')?.addEventListener('click', () => go({ name: 'pick', roomId }))
  root.querySelector('[data-act="gallery"]')?.addEventListener('click', () => go({ name: 'gallery' }))
}

function renderGallery(): void {
  const items = loadGallery()
  root.innerHTML = `
    <main class="page kid">
      <button class="back" data-act="back" type="button">返回</button>
      <h1>我的画</h1>
      ${items.length ? `<div class="gallery-grid" id="g"></div>` : `<p class="lead">还没有画。</p>`}
    </main>`
  const join = joinQuery()
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => {
    if (join && getRoom(join)) go({ name: 'pick', roomId: join })
    else go({ name: 'home' })
  })
  const grid = root.querySelector('#g')
  items.forEach((item) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'gallery-card'
    b.innerHTML = `<img alt="${ANIMAL_META[item.animalId].name}" src="${item.thumb}" />`
    b.addEventListener('click', () => go({ name: 'preview', item }))
    grid?.append(b)
  })
}

function renderItemPreview(item: GalleryItem): void {
  root.innerHTML = `
    <main class="page kid">
      <button class="back" data-act="gallery" type="button">返回</button>
      <div class="preview-frame tall">
        <canvas id="preview-canvas"></canvas>
      </div>
    </main>`
  const canvas = root.querySelector<HTMLCanvasElement>('#preview-canvas')
  if (canvas) {
    preview = new PreviewStage(canvas)
    preview.show(item.animalId, item.regionColors)
  }
  root.querySelector('[data-act="gallery"]')?.addEventListener('click', () => go({ name: 'gallery' }))
}

const join = joinQuery()
if (isHostQuery()) {
  const roomId = new URLSearchParams(location.search).get('room') || newRoomCode()
  if (!getRoom(roomId)) createRoom(roomId)
  go({ name: 'host', roomId })
} else if (join) {
  const room = getRoom(join)
  if (room) go({ name: 'pick', roomId: join })
  else {
    root.innerHTML = `<main class="page kid"><h1>展览结束啦</h1></main>`
  }
} else {
  go({ name: 'home' })
}
