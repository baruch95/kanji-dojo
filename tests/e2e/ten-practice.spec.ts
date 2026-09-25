import { expect, test, type Page } from '@playwright/test'
import { tenDefinition } from '../../src/data/generated/ten'

async function draw(page: Page, points: readonly [number, number][]) {
  const box = await page.getByLabel('Writing surface for ten').boundingBox()
  if (!box) throw new Error('Writing canvas unavailable')
  const [firstX, firstY] = points[0]!
  await page.mouse.move(box.x + box.width * firstX, box.y + box.height * firstY)
  await page.mouse.down()
  for (const [x, y] of points.slice(1)) await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 5 })
  await page.mouse.up()
}

const across: readonly [number, number][] = [[0.11, 0.47], [0.3, 0.46], [0.5, 0.44], [0.7, 0.43], [0.88, 0.42]]
const down: readonly [number, number][] = [[0.48, 0.12], [0.5, 0.25], [0.5, 0.5], [0.5, 0.75], [0.5, 0.91]]

test.beforeEach(async ({ page }) => {
  await page.goto('/#/session')
  await expect(page.getByRole('heading', { name: 'Write 十' })).toBeVisible()
})

test('naturalized strokes can pass; Undo and Clear remove completed ink', async ({ page }) => {
  const check = page.getByRole('button', { name: 'Check' })
  await expect(check).toBeDisabled()
  await draw(page, across)
  await draw(page, down)
  await check.click()
  await expect(page.getByText('Match', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await check.click()
  await expect(page.getByText('Needs another try')).toBeVisible()
  await expect(page.getByText('The number of strokes differs from the reference.')).toBeVisible()
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(check).toBeDisabled()
})

test('reverse direction and swapped order fail explicitly', async ({ page }) => {
  await draw(page, [...across].reverse())
  await draw(page, down)
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByText(/stroke direction/i)).toBeVisible()
  await page.getByRole('button', { name: 'Clear' }).click()
  await draw(page, down)
  await draw(page, across)
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByText(/stroke order/i).first()).toBeVisible()
})

test('leaving the canvas cancels incomplete input without grading', async ({ page }) => {
  const box = await page.getByLabel('Writing surface for ten').boundingBox()
  if (!box) throw new Error('Writing canvas unavailable')
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width + 30, box.y + box.height * 0.5)
  await page.mouse.up()
  await expect(page.getByText('Incomplete stroke canceled. Try that stroke again.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Check' })).toBeDisabled()
  await expect(page.getByText('Match', { exact: true })).toHaveCount(0)
})

test('rendered SVG geometry agrees with generated reference lengths', async ({ page }) => {
  const lengths = await page.locator('.reference-card svg path').evaluateAll((paths) => paths.map((path) => (path as SVGPathElement).getTotalLength()))
  expect(lengths).toHaveLength(2)
  for (let index = 0; index < lengths.length; index++) {
    expect(Math.abs(lengths[index]! / 109 - tenDefinition.strokes[index]!.length)).toBeLessThan(0.001)
  }
})

test('primary writing controls fit iPad-sized landscape and portrait viewports', async ({ page }) => {
  for (const viewport of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(viewport)
    const canvas = await page.getByLabel('Writing surface for ten').boundingBox()
    const check = await page.getByRole('button', { name: 'Check' }).boundingBox()
    expect(canvas).not.toBeNull()
    expect(check).not.toBeNull()
    expect(check!.y + check!.height).toBeLessThanOrEqual(viewport.height)
  }
})
