import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PdfDownloadButton from './PdfDownloadButton'

// Mock Tauri shell
vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn()
}))

describe('PdfDownloadButton', () => {

  it('renders Download PDF button', () => {
    render(<PdfDownloadButton productId={1} productName="Test Product" />)
    expect(screen.getByText('Download PDF')).toBeInTheDocument()
  })

  it('shows popup after clicking download', async () => {
    // ✅ Use vi.stubGlobal instead of global
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['pdf'], { type: 'application/pdf' }))
    }))

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn()
    })

    render(<PdfDownloadButton productId={1} productName="air pods" />)
    fireEvent.click(screen.getByText('Download PDF'))

    const popup = await screen.findByText('PDF Downloaded!')
    expect(popup).toBeInTheDocument()
    expect(screen.getByText(/air pods/i)).toBeInTheDocument()
  })
})
