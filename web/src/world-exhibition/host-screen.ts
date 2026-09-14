/**
 * 世界观展：主机打开森林 / 雪原 / 海底，出示码，收小朋友送来的动物。
 * 不涂色、不出现「送进世界」。
 */
import QRCode from 'qrcode'
import { toast } from '../html'
import { storage } from '../storage'
import {
  clearAnimals,
  createRoom,
  creatorJoinUrl,
  endRoom,
  getRoom,
  onSync,
  patchRoom,
  setTheme,
  touchHost,
} from '../sync'
import type { ThemeId, WorldAction } from '../types'
import { ACTION_META, ROOM_CAP, THEME_IDS, THEME_META, WORLD_ACTIONS } from '../types'
import { HostWorld } from './host-world'

export class HostScreen {
  private world: HostWorld | null = null
  private timer = 0
  private stopSync: (() => void) | null = null
  private seenEmotes = new Set<string>()
  private root: HTMLElement
  private goHome: () => void

  constructor(root: HTMLElement, goHome: () => void) {
    this.root = root
    this.goHome = goHome
  }

  dispose(): void {
    this.world?.dispose()
    this.world = null
    if (this.timer) window.clearInterval(this.timer)
    this.timer = 0
    this.stopSync?.()
    this.stopSync = null
  }

  show(roomId: string): void {
    const room = getRoom(roomId) ?? createRoom(roomId)
    this.root.innerHTML = `
      <div class="host-layout">
        <div class="world-pane">
          <canvas id="world-canvas" aria-label="共享世界"></canvas>
          <p class="world-hint">单指转转看 · 捏一捏或滚轮拉近</p>
          <p class="world-empty" id="world-empty">等小朋友把动物送进来</p>
        </div>
        <aside class="host-panel">
          <button class="back" data-act="home" type="button">返回</button>
          <p class="room-code">${roomId}</p>
          <img class="qr" id="qr" alt="房间码" />
          <p class="lead">小朋友点首页「扫码进入」，用摄像头或选这张码的截图。</p>
          <button type="button" class="text-link" data-act="save-qr">下载二维码</button>
          <p class="occ" id="occ">${room.animals.length}/${ROOM_CAP} 只小动物</p>
          <p class="status" id="status">${hostStatus(room.paused, room.animals.length)}</p>
          <div class="theme-row" id="themes"></div>
          <p class="lead action-lead">点一下，看世界里的动作</p>
          <div class="action-row" id="actions"></div>
          <div class="host-more">
            <button type="button" data-act="pause">${room.paused ? '继续收画' : '暂停收画'}</button>
            <button type="button" data-act="clear">清场</button>
            <button type="button" data-act="end">结束</button>
          </div>
        </aside>
      </div>`
    const canvas = this.root.querySelector<HTMLCanvasElement>('#world-canvas')
    if (!canvas) return
    this.world = new HostWorld(canvas)
    const startAction = new URLSearchParams(location.search).get('action') as WorldAction | null
    if (startAction && WORLD_ACTIONS.includes(startAction)) this.world.setAction(startAction)
    this.world.applyTheme(room.theme)
    this.world.syncAnimals(room.animals)
    const qr = this.root.querySelector<HTMLImageElement>('#qr')
    if (qr) {
      QRCode.toDataURL(creatorJoinUrl(roomId), {
        margin: 1,
        width: 320,
        color: { dark: '#1a120c', light: '#fffaf1' },
      })
        .then((url) => {
          qr.src = url
          qr.dataset.src = url
        })
        .catch(() => undefined)
    }
    this.root.querySelector('[data-act="save-qr"]')?.addEventListener('click', () => {
      const href = qr?.dataset.src || qr?.src
      if (!href) return
      const a = document.createElement('a')
      a.href = href
      a.download = `kid-draw-room-${roomId}.png`
      a.click()
    })
    const themes = this.root.querySelector('#themes')
    if (themes) {
      themes.innerHTML = THEME_IDS.map(
        (id) =>
          `<button type="button" class="theme-btn ${id === room.theme ? 'on' : ''}" data-theme="${id}">${THEME_META[id].emoji}<span>${THEME_META[id].name}</span></button>`,
      ).join('')
      themes.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const theme = btn.dataset.theme as ThemeId
          setTheme(roomId, theme)
          void storage.updateRoomMeta(roomId, { theme })
          this.world?.applyTheme(theme)
          this.refresh(roomId)
        })
      })
    }
    const actions = this.root.querySelector('#actions')
    if (actions) {
      actions.innerHTML = WORLD_ACTIONS.map(
        (id) =>
          `<button type="button" class="action-btn ${id === this.world?.getAction() ? 'on' : ''}" data-action="${id}">${ACTION_META[id].name}</button>`,
      ).join('')
      actions.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.action as WorldAction
          this.world?.setAction(act)
          this.refresh(roomId)
        })
      })
    }
    this.root.querySelector('[data-act="home"]')?.addEventListener('click', () => {
      history.replaceState({}, '', location.pathname)
      this.goHome()
    })
    this.root.querySelector('[data-act="pause"]')?.addEventListener('click', () => {
      const cur = getRoom(roomId)
      if (!cur) return
      patchRoom(roomId, { paused: !cur.paused })
      void storage.updateRoomMeta(roomId, { paused: !cur.paused })
      this.refresh(roomId)
    })
    this.root.querySelector('[data-act="clear"]')?.addEventListener('click', () => {
      clearAnimals(roomId)
      void storage.clearRoomAnimals(roomId)
      this.world?.syncAnimals([])
      this.refresh(roomId)
      toast('场地清好了，可以再请小朋友送画。')
    })
    this.root.querySelector('[data-act="end"]')?.addEventListener('click', () => {
      endRoom(roomId)
      void storage.updateRoomMeta(roomId, { ended: true })
      toast('展览结束啦。')
      history.replaceState({}, '', location.pathname)
      this.goHome()
    })
    const tick = () => {
      touchHost(roomId)
      const cur = getRoom(roomId)
      if (!cur) return
      this.world?.applyTheme(cur.theme)
      this.world?.syncAnimals(cur.animals)
      for (const em of cur.emotes) {
        if (this.seenEmotes.has(em.id)) continue
        this.seenEmotes.add(em.id)
        this.world?.showEmote(em.animalId, em.emote)
      }
      this.refresh(roomId)
    }
    tick()
    this.timer = window.setInterval(tick, 900)
    this.stopSync = onSync(tick)
  }

  private refresh(roomId: string): void {
    const room = getRoom(roomId)
    if (!room) return
    const empty = this.root.querySelector('#world-empty')
    const pauseBtn = this.root.querySelector('[data-act="pause"]')
    const occ = this.root.querySelector('#occ')
    const status = this.root.querySelector('#status')
    if (empty) empty.textContent = room.animals.length ? '' : '等小朋友把动物送进来'
    if (pauseBtn) pauseBtn.textContent = room.paused ? '继续收画' : '暂停收画'
    if (occ) occ.textContent = `${room.animals.length}/${ROOM_CAP} 只小动物`
    if (status) status.textContent = hostStatus(room.paused, room.animals.length)
    this.root.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.theme === room.theme)
    })
    const current = this.world?.getAction()
    this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.action === current)
    })
  }
}

function hostStatus(paused: boolean, count: number): string {
  if (paused) return '已暂停收画'
  if (count >= ROOM_CAP) return '满员啦，请先清场'
  return '正在收画'
}
