import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from './api'

// ✅ Type for mock fetch
type MockFetch = ReturnType<typeof vi.fn>

describe('api service', () => {

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('getProducts calls correct endpoint', async () => {
    const mockProducts = [{ id: 1, name: 'air pods', price: 100 }]

    const mockFetch = fetch as MockFetch
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockProducts)
    })

    const result = await api.getProducts()

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/products')
    )
    expect(result).toEqual(mockProducts)
  })

  it('createProduct sends correct data', async () => {
    const newProduct = { name: 'MacBook', price: 2499 }
    const mockResponse = { id: 2, ...newProduct }

    const mockFetch = fetch as MockFetch
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockResponse)
    })

    const result = await api.createProduct(newProduct as Parameters<typeof api.createProduct>[0])

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/products'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      })
    )
    expect(result).toEqual(mockResponse)
  })

  it('deleteProduct calls correct endpoint with DELETE method', async () => {
    const mockFetch = fetch as MockFetch
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ message: 'deleted' })
    })

    await api.deleteProduct(1)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/products/1'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
