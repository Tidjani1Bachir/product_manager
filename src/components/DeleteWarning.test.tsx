import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DeleteWarning from './DeleteWarning'

describe('DeleteWarning', () => {

  it('does not render when open is false', () => {
    render(
      <DeleteWarning
        open={false}
        onClose={vi.fn()}
        title="Delete Product"
        message="Are you sure?"
      />
    )
    expect(screen.queryByText('Delete Product')).not.toBeInTheDocument()
  })

  it('renders correctly when open is true', () => {
    render(
      <DeleteWarning
        open={true}
        onClose={vi.fn()}
        title="Delete Product"
        message="Are you sure you want to delete this?"
      />
    )
    expect(screen.getByText('Delete Product')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to delete this?')).toBeInTheDocument()
  })

  it('calls onConfirm and onClose when OK is clicked', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()

    render(
      <DeleteWarning
        open={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Delete"
        message="Sure?"
      />
    )

    fireEvent.click(screen.getByText('OK'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledWith(false)
  })

  it('calls onCancel and onClose when Cancel is clicked', () => {
    const onCancel = vi.fn()
    const onClose = vi.fn()

    render(
      <DeleteWarning
        open={true}
        onClose={onClose}
        onCancel={onCancel}
        title="Delete"
        message="Sure?"
      />
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledWith(false)
  })
})