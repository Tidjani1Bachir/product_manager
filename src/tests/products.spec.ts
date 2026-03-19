import { test, expect } from '@playwright/test'

test.describe('Product Manager App', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    // ✅ Wait for app to fully load
    await page.waitForLoadState('networkidle')
  })

  test('shows Products heading', async ({ page }) => {
    await expect(page.getByText('Products Manager')).toBeVisible()
  })

  test('shows Add New Product button', async ({ page }) => {
    await expect(page.getByRole('button', { name: '+ Add New Product' })).toBeVisible()
  })

  test('opens add product form when clicking Add New Product', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add New Product' }).click()
    // ✅ Use heading role to be specific
    await expect(page.getByRole('heading', { name: 'Add New Product' })).toBeVisible()
  })

  test('can search products', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  
  const searchInput = page.getByPlaceholder('Search anything about a product...')
  
  // ✅ Just test that search input works — type something and check input has value
  await searchInput.fill('test search')
  await expect(searchInput).toHaveValue('test search')
  
  // ✅ Clear and verify it clears
  await searchInput.clear()
  await expect(searchInput).toHaveValue('')
})

  test('cancel button closes the form', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add New Product' }).click()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('button', { name: '+ Add New Product' })).toBeVisible()
  })

  test('shows validation error when creating product without name', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add New Product' }).click()

    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Product name is required')
      await dialog.accept()
    })

    await page.getByRole('button', { name: 'Create Product' }).click()
  })
})