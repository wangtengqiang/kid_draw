/**
 * 世界观展用例界面入口：主机森林、画廊缩略图、只读 3D 预览。
 * 不包含选动物 / 涂色 / 送进世界。
 */
import type { GalleryItem } from '../types'
import { GalleryScreen } from './gallery-screen'
import { HostScreen } from './host-screen'
import { PreviewScreen } from './preview-screen'

export type ExhibitionGo =
  | { name: 'home' }
  | { name: 'host'; roomId: string }
  | { name: 'gallery' }
  | { name: 'preview'; item: GalleryItem }

export class WorldExhibition {
  private host: HostScreen
  private gallery: GalleryScreen
  private preview: PreviewScreen

  constructor(
    root: HTMLElement,
    go: (s: ExhibitionGo) => void,
  ) {
    this.host = new HostScreen(root, () => go({ name: 'home' }))
    this.gallery = new GalleryScreen(root, go)
    this.preview = new PreviewScreen(root, () => go({ name: 'gallery' }))
  }

  dispose(): void {
    this.host.dispose()
    this.preview.dispose()
  }

  showHost(roomId: string): void {
    this.host.show(roomId)
  }

  showGallery(): void {
    this.gallery.show()
  }

  showPreview(item: GalleryItem): void {
    this.preview.show(item)
  }
}
