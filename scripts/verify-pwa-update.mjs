import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import process from 'node:process'
import { URL } from 'node:url'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { chromium } from '@playwright/test'

const root = resolve(import.meta.dirname, '..')
const scratch = await mkdtemp(join(tmpdir(), 'kanji-dojo-pwa-'))
const output = join(scratch, 'kanji-dojo')
const contentTypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }

function build(revision) {
  execFileSync('npm', ['run', 'build'], { cwd: root, env: { ...process.env, VITE_BASE_PATH: '/kanji-dojo/', ...(revision ? { PWA_UPDATE_TEST_REVISION: revision } : {}) }, stdio: 'pipe' })
}
async function publish() { await cp(join(root, 'dist'), output, { recursive: true, force: true }) }
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const relative = pathname === '/kanji-dojo/' ? 'index.html' : pathname.replace(/^\/kanji-dojo\//, '')
  const filename = resolve(output, relative)
  if (!pathname.startsWith('/kanji-dojo/') || !(filename === output || filename.startsWith(`${output}${sep}`))) { response.writeHead(404).end(); return }
  try {
    const data = await readFile(filename)
    const extension = filename.slice(filename.lastIndexOf('.'))
    response.writeHead(200, { 'Content-Type': contentTypes[extension] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(data)
  } catch { response.writeHead(404).end() }
})

let browser
try {
  build(null)
  await publish()
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No local port')
  const base = `http://127.0.0.1:${address.port}/kanji-dojo/`
  browser = await chromium.launch()
  const context = await browser.newContext({ serviceWorkers: 'allow' })
  const page = await context.newPage()
  await page.goto(base)
  await page.getByRole('heading', { name: 'Remember by writing.' }).waitFor()
  await page.waitForFunction(() => globalThis.navigator.serviceWorker.ready.then(() => Boolean(globalThis.navigator.serviceWorker.controller)))
  await page.reload()
  await page.getByText('Available offline').waitFor()
  await page.getByLabel('New cards').selectOption('5')
  await page.getByRole('button', { name: 'Start session' }).click()
  const box = await page.getByLabel('Writing surface').boundingBox()
  if (!box) throw new Error('Writing surface absent')
  await page.mouse.move(box.x + box.width * .2, box.y + box.height * .5)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * .7, box.y + box.height * .5)
  await page.mouse.up()
  await page.getByRole('button', { name: 'Undo' }).waitFor()
  build('B')
  await publish()
  await page.evaluate(() => globalThis.navigator.serviceWorker.getRegistration().then((registration) => registration?.update()))
  await page.getByText('Update available after this session').waitFor({ timeout: 20_000 })
  if (!await page.getByRole('button', { name: 'Undo' }).isEnabled()) throw new Error('Ink was lost during update installation')
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'End session' }).click()
  await Promise.all([page.waitForEvent('load', { timeout: 20_000 }), page.getByRole('button', { name: 'Update available · reload' }).click()])
  await page.getByRole('heading', { name: 'No active session' }).waitFor({ timeout: 20_000 })
  await page.getByRole('link', { name: 'Return home →' }).click()
  await page.getByRole('heading', { name: 'Remember by writing.' }).waitFor()
  await page.getByText(/1 unfinished/).first().waitFor()
  const manifest = await page.request.get(`${base}manifest.webmanifest`)
  if (!(await manifest.text()).includes('update test B')) throw new Error('Build B did not replace build A')
  process.stdout.write('Two-build update deferred during ink/session, then activated with progress intact\n')
} finally {
  if (browser) await browser.close()
  await new Promise((resolve) => server.close(resolve))
  await rm(scratch, { recursive: true, force: true })
}
