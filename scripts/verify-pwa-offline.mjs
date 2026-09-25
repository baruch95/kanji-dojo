import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import process from 'node:process'
import { URL } from 'node:url'
import { chromium } from '@playwright/test'

const root = resolve(import.meta.dirname, '..')
const scratch = await mkdtemp(join(tmpdir(), 'kanji-dojo-offline-'))
const contentTypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }

async function verify(basePath) {
  execFileSync('npm', ['run', 'build'], { cwd: root, env: { ...process.env, VITE_BASE_PATH: basePath }, stdio: 'pipe' })
  const folder = resolve(scratch, basePath === '/' ? 'root' : 'subpath')
  await cp(join(root, 'dist'), folder, { recursive: true })
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const relative = pathname === basePath ? 'index.html' : pathname.slice(basePath.length)
    const filename = resolve(folder, relative)
    if (!pathname.startsWith(basePath) || !(filename === folder || filename.startsWith(`${folder}${sep}`))) { response.writeHead(404).end(); return }
    try {
      const data = await readFile(filename)
      const extension = filename.slice(filename.lastIndexOf('.'))
      response.writeHead(200, { 'Content-Type': contentTypes[extension] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(data)
    } catch { response.writeHead(404).end() }
  })
  let browser
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('No local port')
    const base = `http://127.0.0.1:${address.port}${basePath}`
    browser = await chromium.launch()
    const context = await browser.newContext({ serviceWorkers: 'allow' })
    let page = await context.newPage()
    await page.goto(base)
    await page.getByRole('heading', { name: 'Remember by writing.' }).waitFor()
    for (const resource of ['manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) {
      const response = await page.request.get(base + resource)
      if (response.status() !== 200) throw new Error(`${resource} returned ${response.status()}`)
    }
    await page.waitForFunction(() => globalThis.navigator.serviceWorker.ready.then(() => Boolean(globalThis.navigator.serviceWorker.controller)))
    await page.reload()
    await page.getByText('Available offline').waitFor()
    const scope = await page.evaluate(async () => (await globalThis.navigator.serviceWorker.ready).scope)
    if (scope !== base) throw new Error(`Wrong worker scope ${scope}`)
    await page.getByLabel('New cards').selectOption('5')
    await page.getByRole('button', { name: 'Start session' }).click()
    await writeOne(page)
    await page.getByRole('button', { name: 'Check' }).click()
    await page.getByText('Match saved').waitFor()
    await page.close()
    await context.setOffline(true)
    page = await context.newPage()
    await page.goto(base + '#/session')
    await page.getByText('Match saved').waitFor()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByText('Learning · copy').waitFor()
    await writeOne(page)
    await page.getByRole('button', { name: 'Check' }).click()
    await page.getByText('Match saved').waitFor()
    await page.close()
    page = await context.newPage()
    await page.goto(base + '#/session')
    await page.getByText('Match saved').waitFor()
    process.stdout.write(`${basePath}: offline cold reopen and offline grade persistence passed\n`)
  } finally {
    if (browser) await browser.close()
    if (server.listening) await new Promise((resolve) => server.close(resolve))
  }
}

async function writeOne(page) {
  const box = await page.getByLabel('Writing surface').boundingBox()
  if (!box) throw new Error('Writing surface absent')
  const points = [[.101, .498], [.3, .49], [.5, .475], [.7, .465], [.89, .459]]
  await page.mouse.move(box.x + points[0][0] * box.width, box.y + points[0][1] * box.height)
  await page.mouse.down()
  for (const [x, y] of points.slice(1)) await page.mouse.move(box.x + x * box.width, box.y + y * box.height, { steps: 5 })
  await page.mouse.up()
}

try { await verify('/'); await verify('/kanji-dojo/') } finally { await rm(scratch, { recursive: true, force: true }) }
