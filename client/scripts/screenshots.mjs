import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const clientDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rootDir = resolve(clientDir, '..')
const docsDir = resolve(rootDir, 'docs')

const API = 'http://localhost:5000'
const APP = 'http://localhost:5173'
const DEMO = { email: 'demo@shoptrack.dev', password: 'demo1234' }

const BROWSERS = [
  process.env.SCREENSHOT_BROWSER,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

const sleep = (ms) => new Promise((resolve_) => setTimeout(resolve_, ms))

async function waitFor(url, label, timeout = 60000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // server not ready yet
    }
    await sleep(500)
  }
  throw new Error(`${label} did not start at ${url}`)
}

async function ensureRunning(name, cwd, script, url) {
  try {
    const res = await fetch(url)
    if (res.ok) {
      console.log(`Using running ${name} at ${url}`)
      return null
    }
  } catch {
    // not running
  }

  console.log(`Starting ${name}...`)
  const child = spawn('npm', ['run', script], { cwd, shell: true, stdio: 'ignore', windowsHide: true })
  await waitFor(url, name)
  return child
}

function stop(child) {
  if (!child) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
  } else {
    child.kill('SIGTERM')
  }
}

async function main() {
  const browserPath = BROWSERS.find((path) => existsSync(path))
  if (!browserPath) throw new Error('Edge or Chrome was not found')
  mkdirSync(docsDir, { recursive: true })

  const started = []
  let browser
  try {
    const server = await ensureRunning('API', resolve(rootDir, 'server'), 'start', `${API}/api/health`)
    if (server) started.push(server)
    const client = await ensureRunning('client', clientDir, 'dev', APP)
    if (client) started.push(client)

    const login = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DEMO),
    })
    if (!login.ok) throw new Error(`Demo login failed with status ${login.status}`)
    const { token } = await login.json()

    browser = await chromium.launch({ executablePath: browserPath, headless: true })

    const context = await browser.newContext({
      viewport: { width: 1280, height: 1083 },
      colorScheme: 'light',
      deviceScaleFactor: 1,
    })
    await context.addInitScript(
      ({ token }) => {
        localStorage.setItem('shoptrack_token', token)
        localStorage.setItem('shoptrack_theme', 'light')
      },
      { token },
    )

    const page = await context.newPage()
    page.setDefaultTimeout(20000)

    const open = async (path, width, height, selector) => {
      await page.setViewportSize({ width, height })
      await page.goto(`${APP}${path}`, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle').catch(() => {})
      if (selector) await page.waitForSelector(selector)
      await sleep(700)
    }

    const expectActiveNav = async (expected) => {
      const active = page.locator('nav[aria-label="Main"] .sidebar-item-active')
      const labels = (await active.allInnerTexts()).map((text) =>
        text.replace(/\s+/g, ' ').replace(/\s+\d+$/, '').trim(),
      )
      if (labels.length !== 1 || labels[0] !== expected) {
        throw new Error(`Expected only "${expected}" active, found: ${JSON.stringify(labels)}`)
      }
      console.log(`Nav check: only ${expected} is active`)
    }

    await open('/', 1280, 1083, '.recharts-surface')
    await expectActiveNav('Dashboard')
    const desktopHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    if (desktopHeight > 1083) await page.setViewportSize({ width: 1280, height: desktopHeight })
    await sleep(400)
    console.log(`Dashboard captured at 1280x${Math.max(1083, desktopHeight)}`)
    await page.screenshot({ path: resolve(docsDir, 'dashboard.png'), animations: 'disabled' })
    console.log('Saved docs/dashboard.png')

    await open('/products', 1280, 700, 'tbody tr')
    await expectActiveNav('Inventory')
    console.log(`Inventory rows: ${await page.locator('tbody tr').count()}`)
    await page.screenshot({ path: resolve(docsDir, 'products.png'), animations: 'disabled' })
    console.log('Saved docs/products.png')

    await open('/sales/new', 1280, 700, 'section[aria-labelledby="pick-title"] div.grid > button')
    await expectActiveNav('Point of sale')
    const cards = page.locator('section[aria-labelledby="pick-title"] div.grid > button:not([disabled])')
    const picks = Math.min(3, await cards.count())
    for (let i = 0; i < picks; i += 1) await cards.nth(i).click()
    await page.getByRole('radio', { name: 'Mobile' }).click()
    if ((await page.getByRole('radio', { name: 'Mobile' }).getAttribute('aria-checked')) !== 'true') {
      throw new Error('Mobile payment was not selected')
    }
    console.log(`Pos cart items: ${await page.locator('aside li').count()}`)
    await sleep(300)
    await page.screenshot({ path: resolve(docsDir, 'new-sale.png'), animations: 'disabled' })
    console.log('Saved docs/new-sale.png')

    await open('/sales', 1280, 700, 'tbody tr')
    await expectActiveNav('Sales history')
    console.log(`Sales rows: ${await page.locator('tbody tr').count()}`)
    await page.screenshot({ path: resolve(docsDir, 'sales.png'), animations: 'disabled' })
    console.log('Saved docs/sales.png')

    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: 'light',
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    })
    await mobile.addInitScript(
      ({ token }) => {
        localStorage.setItem('shoptrack_token', token)
        localStorage.setItem('shoptrack_theme', 'light')
      },
      { token },
    )
    const mobilePage = await mobile.newPage()
    mobilePage.setDefaultTimeout(20000)
    await mobilePage.goto(`${APP}/`, { waitUntil: 'domcontentloaded' })
    await mobilePage.waitForLoadState('networkidle').catch(() => {})
    await mobilePage.waitForSelector('.recharts-surface')
    await sleep(700)
    await mobilePage.screenshot({ path: resolve(docsDir, 'mobile-dashboard.png'), animations: 'disabled' })
    console.log('Saved docs/mobile-dashboard.png')
  } finally {
    if (browser) await browser.close()
    started.forEach(stop)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
