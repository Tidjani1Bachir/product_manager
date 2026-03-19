import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'

const BASE_URL = 'http://localhost:5000/api'

describe('Products API', () => {

  let createdProductId

  it('GET /api/products returns array', async () => {
    const res = await fetch(`${BASE_URL}/products`)
    const data = await res.json()

    assert.strictEqual(res.status, 200)
    assert.ok(Array.isArray(data))
  })

  it('POST /api/products creates a product', async () => {
    const res = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Product',
        price: 99.99,
        description: 'Test description'
      })
    })
    const data = await res.json()

    assert.strictEqual(res.status, 201)
    assert.strictEqual(data.name, 'Test Product')
    assert.ok(data.id)

    createdProductId = data.id
  })

  it('GET /api/products/:id returns product', async () => {
    const res = await fetch(`${BASE_URL}/products/${createdProductId}`)
    const data = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(data.name, 'Test Product')
  })

  it('PUT /api/products/:id updates product', async () => {
    const res = await fetch(`${BASE_URL}/products/${createdProductId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 149.99 })
    })
    const data = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(Number(data.price), 149.99)
  })

  it('DELETE /api/products/:id deletes product', async () => {
    const res = await fetch(`${BASE_URL}/products/${createdProductId}`, {
      method: 'DELETE'
    })
    const data = await res.json()

    assert.strictEqual(res.status, 200)
    assert.strictEqual(data.message, 'Product deleted successfully')
  })

  it('GET /api/products/:id returns 404 after delete', async () => {
    const res = await fetch(`${BASE_URL}/products/${createdProductId}`)
    assert.strictEqual(res.status, 404)
  })
})