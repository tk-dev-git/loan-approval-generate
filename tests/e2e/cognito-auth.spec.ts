import { test, expect } from '@playwright/test'

const username = process.env.COGNITO_USERNAME
const password = process.env.COGNITO_PASSWORD
const appBaseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const appOrigin = new URL(appBaseURL).origin
const appHomeURL = new URL('/', appBaseURL).toString()
const logoutCompleteURL = new URL('/logout-complete', appBaseURL).toString()

const ensureHttps = (value?: string | null) => {
  if (!value) return null
  return value.startsWith('http://') || value.startsWith('https://')
    ? value
    : `https://${value}`
}

const cognitoDomainEnv = ensureHttps(process.env.COGNITO_DOMAIN || process.env.NUXT_PUBLIC_COGNITO_DOMAIN)
const cognitoOrigin = cognitoDomainEnv ? new URL(cognitoDomainEnv).origin : 'https://ap-northeast-1pifvzstid.auth.ap-northeast-1.amazoncognito.com'

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const authorizeUrlPattern = new RegExp(`${escapeRegExp(cognitoOrigin)}/.*`)
const encodedLogoutUri = encodeURIComponent(logoutCompleteURL)
const logoutUrlPattern = new RegExp(`${escapeRegExp(`${cognitoOrigin}/logout`)}.*logout_uri=${escapeRegExp(encodedLogoutUri)}`)

const allowMismatchScope = !!process.env.COGNITO_ALLOW_SCOPE_ERROR

if (!username || !password) {
  throw new Error('COGNITO_USERNAME と COGNITO_PASSWORD が環境変数として設定されていません')
}

test('Cognito Hosted UI でログイン後にアプリへ戻りログアウトできる', async ({ page, context }) => {
  await context.clearCookies()
  await page.goto(appHomeURL, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
  await page.reload({ waitUntil: 'networkidle' })

  // 既にログイン済みの場合は先にサインアウトして状態をリセット
  const initialLogoutButton = page.getByRole('button', { name: 'ログアウト' })
  if (await initialLogoutButton.count()) {
    await Promise.all([
      page.waitForRequest(request => logoutUrlPattern.test(request.url())),
      page.waitForURL(logoutCompleteURL, { timeout: 60_000 }),
      initialLogoutButton.first().click()
    ])
    await page.goto(appHomeURL, { waitUntil: 'networkidle' })
  }

  const loginButton = page.getByRole('button', { name: 'ログイン' })

  try {
    await expect(loginButton).toBeVisible({ timeout: 15_000 })
    await loginButton.click()
  } catch (error) {
    const url = page.url()
    if (url.includes('error=invalid_request')) {
      throw new Error('Cognito scope mismatch: invalid_request')
    }
    await expect(page).toHaveURL(authorizeUrlPattern, { timeout: 60_000 })
  }

  if (page.url().includes('error=invalid_request')) {
    throw new Error('Cognito scope mismatch encountered during login flow.')
  }

  await expect(page).toHaveURL(authorizeUrlPattern, { timeout: 60_000 })

  const usernameInput = page.locator('input[name="username"]')
  await expect(usernameInput).toBeVisible({ timeout: 30_000 })
  await usernameInput.fill(username)
  const nextButton = page.getByRole('button', { name: /Next/i })
  await expect(nextButton).toBeVisible({ timeout: 10_000 })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    nextButton.click()
  ])

  const passwordInput = page.locator('input[name="password"]')
  await expect(passwordInput).toBeVisible({ timeout: 30_000 })
  await passwordInput.fill(password)
  const continueButton = page.getByRole('button', { name: /Continue|Sign in/i })
  await expect(continueButton).toBeVisible({ timeout: 10_000 })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    continueButton.click()
  ])

  const homeUrlPattern = new RegExp(`^${escapeRegExp(appHomeURL)}(?:[?#].*)?$`)
  await expect(page).toHaveURL(homeUrlPattern, { timeout: 60_000 })

  const logoutButton = page.getByRole('button', { name: 'ログアウト' })
  await expect(logoutButton).toBeVisible({ timeout: 30_000 })

  await Promise.all([
    page.waitForRequest(request => logoutUrlPattern.test(request.url())),
    page.waitForURL(logoutCompleteURL, { timeout: 60_000 }),
    logoutButton.click()
  ])
})
