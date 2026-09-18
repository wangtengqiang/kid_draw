/**
 * 首页分流：打开世界 / 开始画画 / 拍纸上的画 / 我的画。
 * 打印线稿给老师，不放在孩子默认首页当下载列表。
 * 屏上涂色在 child-creation/，纸上拍照在 paper-coloring/，观展在 world-exhibition/。
 */
import { ChildCreation } from './child-creation'
import type { ChildGo } from './child-creation'
import { PaperColoring } from './paper-coloring'
import type { PaperGo } from './paper-coloring'
import { storage } from './storage'
import { createRoom, ensurePreviewRoom, getRoom, hostSearch, isHostQuery, joinQuery, newRoomCode } from './sync'
import { ROOM_CAP } from './types'
import { WorldExhibition } from './world-exhibition'
import type { ExhibitionGo } from './world-exhibition'
import { loadAnimalTemplates } from './world-exhibition/models'
import { bakeAllDefaultSnapshots, snapshotPet } from './world-exhibition/pet-snapshot'

type Screen = { name: 'home' } | ChildGo | ExhibitionGo | PaperGo

export class App {
  private root: HTMLElement
  private child: ChildCreation
  private exhibition: WorldExhibition
  private paper: PaperColoring
  private screen: Screen = { name: 'home' }

  constructor(root: HTMLElement) {
    this.root = root
    this.child = new ChildCreation(root, (s) => this.go(s))
    this.exhibition = new WorldExhibition(root, (s) => this.go(s))
    this.paper = new PaperColoring(root, (s) => this.go(s))
  }

  async start(): Promise<void> {
    this.root.innerHTML = `<main class="page home"><p class="lead">正在打开小动物…</p></main>`
    await loadAnimalTemplates()
    const w = window as unknown as {
      __kidDrawSnapshotPet: typeof snapshotPet
      __kidDrawBakePets: typeof bakeAllDefaultSnapshots
    }
    w.__kidDrawSnapshotPet = snapshotPet
    w.__kidDrawBakePets = bakeAllDefaultSnapshots
    const join = joinQuery()
    if (isHostQuery()) {
      const roomId = new URLSearchParams(location.search).get('room') || newRoomCode()
      if (!getRoom(roomId)) createRoom(roomId)
      this.go({ name: 'host', roomId })
      return
    }
    if (join && !getRoom(join)) {
      this.go({ name: 'ended' })
      return
    }
    this.go({ name: 'home' })
  }

  private go(next: Screen): void {
    this.exhibition.dispose()
    this.child.dispose()
    this.paper.dispose()
    this.screen = next
    if (next.name === 'host') {
      history.replaceState({}, '', `${location.pathname}${hostSearch(next.roomId)}`)
    }
    this.render()
  }

  private render(): void {
    const s = this.screen
    if (s.name === 'home') this.home()
    else if (s.name === 'host') this.exhibition.showHost(s.roomId)
    else if (s.name === 'gallery') this.exhibition.showGallery()
    else if (s.name === 'preview') this.exhibition.showPreview(s.item)
    else if (s.name === 'need-scan') this.child.needScan()
    else if (s.name === 'scan') this.child.scan()
    else if (s.name === 'drafts') this.child.showDrafts()
    else if (s.name === 'replace-draft') this.child.showReplaceDraft()
    else if (s.name === 'ended') this.child.ended()
    else if (s.name === 'pick') this.child.pick(s.roomId)
    else if (s.name === 'paint') this.child.paintScreen(s.roomId, s.animalId, s.draftId)
    else if (s.name === 'success') this.child.success(s.roomId, s.placed, s.thumb)
    else if (s.name === 'paper-print') this.paper.print()
    else if (s.name === 'paper-need-scan') this.paper.needScan()
    else if (s.name === 'paper-pick') this.paper.pick(s.roomId)
    else if (s.name === 'paper-camera') this.paper.camera(s.roomId, s.animalId)
    else this.paper.success(s.roomId, s.placed, s.thumb)
  }

  private home(): void {
    this.root.innerHTML = `
      <main class="page home">
        <div class="home-hero">
          <img class="hero-mark" src="/picks/lion.png" alt="" />
          <h1>彩绘动物进森林</h1>
          <p class="lead">一台主机打开世界。小朋友只涂色、把画送进去。</p>
        </div>
        <p class="home-kicker">老师 · 主机</p>
        <button class="hit host-hit" data-act="host" type="button">打开世界</button>
        <p class="home-kicker">小朋友</p>
        <button class="hit kid-hit" data-act="draw" type="button">开始画画</button>
        <button class="hit paper-hit" data-act="paper" type="button">拍纸上的画</button>
        <button class="hit scan-hit" data-act="scan" type="button">扫码进入</button>
        <button class="text-link" data-act="gallery" type="button">我的画</button>
        <button class="text-link" data-act="drafts" type="button">我的草稿</button>
        <button class="text-link quiet" data-act="print" type="button">老师打印线稿</button>
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
      history.replaceState({}, '', `${location.pathname}${hostSearch(id)}`)
      this.go({ name: 'host', roomId: id })
    })
    this.root.querySelector('[data-act="draw"]')?.addEventListener('click', () => {
      const join = joinQuery()
      if (join) {
        if (getRoom(join)) this.go({ name: 'pick', roomId: join })
        else this.go({ name: 'need-scan' })
        return
      }
      const roomId = ensurePreviewRoom()
      void storage.createRoom({
        code: roomId,
        theme: 'forest',
        paused: false,
        ended: false,
        hostAliveAt: Date.now(),
        cap: ROOM_CAP,
      })
      this.go({ name: 'pick', roomId })
    })
    this.root.querySelector('[data-act="scan"]')?.addEventListener('click', () => this.go({ name: 'scan' }))
    this.root.querySelector('[data-act="paper"]')?.addEventListener('click', () => {
      const join = joinQuery()
      if (join && getRoom(join)) this.go({ name: 'paper-pick', roomId: join })
      else this.go({ name: 'paper-need-scan' })
    })
    this.root.querySelector('[data-act="gallery"]')?.addEventListener('click', () => this.go({ name: 'gallery' }))
    this.root.querySelector('[data-act="drafts"]')?.addEventListener('click', () => this.go({ name: 'drafts' }))
    this.root.querySelector('[data-act="print"]')?.addEventListener('click', () => this.go({ name: 'paper-print' }))
  }
}
