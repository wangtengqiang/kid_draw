/**
 * 首页分流：我是主机 / 我是小朋友 / 我的全部作品。
 * 儿童创作界面在 child-creation/，观展界面在 world-exhibition/。
 */
import { ChildCreation } from './child-creation'
import type { ChildGo } from './child-creation'
import { storage } from './storage'
import { createRoom, getRoom, isHostQuery, joinQuery, newRoomCode } from './sync'
import { ROOM_CAP } from './types'
import { WorldExhibition } from './world-exhibition'
import type { ExhibitionGo } from './world-exhibition'

type Screen = { name: 'home' } | ChildGo | ExhibitionGo

export class App {
  private root: HTMLElement
  private child: ChildCreation
  private exhibition: WorldExhibition
  private screen: Screen = { name: 'home' }

  constructor(root: HTMLElement) {
    this.root = root
    this.child = new ChildCreation(root, (s) => this.go(s))
    this.exhibition = new WorldExhibition(root, (s) => this.go(s))
  }

  start(): void {
    const join = joinQuery()
    if (isHostQuery()) {
      const roomId = new URLSearchParams(location.search).get('room') || newRoomCode()
      if (!getRoom(roomId)) createRoom(roomId)
      this.go({ name: 'host', roomId })
      return
    }
    if (join && getRoom(join)) {
      this.go({ name: 'pick', roomId: join })
      return
    }
    if (join) {
      this.go({ name: 'join', error: '找不到这场展览，问问主持人身边的号码吧。' })
      return
    }
    this.go({ name: 'home' })
  }

  private go(next: Screen): void {
    this.exhibition.dispose()
    this.child.dispose()
    this.screen = next
    this.render()
  }

  private render(): void {
    const s = this.screen
    if (s.name === 'home') this.home()
    else if (s.name === 'host') this.exhibition.showHost(s.roomId)
    else if (s.name === 'gallery') this.exhibition.showGallery()
    else if (s.name === 'preview') this.exhibition.showPreview(s.item)
    else if (s.name === 'join') this.child.join(s.error)
    else if (s.name === 'ended') this.child.ended()
    else if (s.name === 'pick') this.child.pick(s.roomId)
    else if (s.name === 'paint') this.child.paintScreen(s.roomId, s.animalId)
    else this.child.success(s.roomId, s.placed, s.thumb)
  }

  private home(): void {
    this.root.innerHTML = `
      <main class="page home">
        <div class="hero-mark" aria-hidden="true">🦌</div>
        <h1>彩绘动物进森林</h1>
        <p class="lead">一台主机打开世界。小朋友只涂色、把画送进去——不用走进大森林，但可以转一转自己的立体模型。</p>
        <button class="hit host-hit" data-act="host" type="button">我是主机</button>
        <button class="hit kid-hit" data-act="draw" type="button">我是小朋友</button>
        <button class="text-link" data-act="gallery" type="button">看看我的全部作品</button>
      </main>`
    this.root.querySelector('[data-act="host"]')?.addEventListener('click', () => {
      const id = newRoomCode()
      createRoom(id)
      void storage.createRoom({
        code: id,
        theme: 'forest',
        paused: false,
        ended: false,
        hostAliveAt: Date.now(),
        cap: ROOM_CAP,
      })
      history.replaceState({}, '', `${location.pathname}?host=1&room=${id}`)
      this.go({ name: 'host', roomId: id })
    })
    this.root.querySelector('[data-act="draw"]')?.addEventListener('click', () => {
      const join = joinQuery()
      if (join && getRoom(join)) this.go({ name: 'pick', roomId: join })
      else this.go({ name: 'join' })
    })
    this.root.querySelector('[data-act="gallery"]')?.addEventListener('click', () => this.go({ name: 'gallery' }))
  }
}
