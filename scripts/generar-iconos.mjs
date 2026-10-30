// Genera los íconos PNG y el splash a partir de public/favicon.svg.
// Uso: node scripts/generar-iconos.mjs   (requiere Playwright/Chromium)
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const svg = readFileSync('public/favicon.svg', 'utf8')
const fuente = 'data:font/woff2;base64,' + readFileSync(resolve('node_modules/@fontsource/bungee/files/bungee-latin-400-normal.woff2')).toString('base64')
const browser = await chromium.launch()
const page = await browser.newPage()

async function render(html, w, h, out) {
  await page.setViewportSize({ width: w, height: h })
  await page.setContent(`<html><head><style>
    @font-face { font-family: Bungee; src: url(${fuente}); }
    html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:transparent}
  </style></head><body>${html}</body></html>`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: out, omitBackground: true })
  console.log('✓', out)
}

const icono = (s) => `<div style="width:${s}px;height:${s}px">${svg.replace('<svg ', `<svg width="${s}" height="${s}" `)}</div>`
// Maskable: sin esquinas redondeadas y con margen de seguridad
const maskable = (s) => `<div style="width:${s}px;height:${s}px;background:#16051f;display:grid;place-items:center">
  ${svg.replace('<svg ', `<svg width="${s * 0.8}" height="${s * 0.8}" `).replace('rx="112"', 'rx="0"')}</div>`

await render(icono(192), 192, 192, 'public/icon-192.png')
await render(icono(512), 512, 512, 'public/icon-512.png')
await render(maskable(512), 512, 512, 'public/icon-maskable-512.png')
await render(maskable(1024), 1024, 1024, 'assets/icon-only.png')
await render(`<div style="width:1024px;height:1024px;display:grid;place-items:center">${svg.replace('<svg ', '<svg width="660" height="660" ').replace(/<rect[^>]*\/>/, '')}</div>`, 1024, 1024, 'assets/icon-foreground.png')
await render('<div style="width:1024px;height:1024px;background:#16051f"></div>', 1024, 1024, 'assets/icon-background.png')

const splash = (w, h) => `<div style="width:${w}px;height:${h}px;background:#16051f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${w * 0.05}px">
  ${svg.replace('<svg ', `<svg width="${w * 0.32}" height="${w * 0.32}" `)}
  <div style="font-family:Bungee;font-size:${w * 0.11}px;background:linear-gradient(90deg,#e40303,#ff8c00,#ffed00,#008026,#004dff,#750787);-webkit-background-clip:text;color:transparent">CAZATROLO</div>
  <div style="font-family:Bungee;font-size:${w * 0.035}px;color:#cbb6e6">¡A CAZAR!</div></div>`
await render(splash(2732, 2732), 2732, 2732, 'assets/splash.png')
await render(splash(2732, 2732), 2732, 2732, 'assets/splash-dark.png')
await browser.close()
