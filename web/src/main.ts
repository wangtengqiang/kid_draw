import { App } from './boot.ts'
import './style.css'

const root = document.querySelector<HTMLDivElement>('#app')
if (!root) throw new Error('找不到页面根节点')
new App(root).start()
