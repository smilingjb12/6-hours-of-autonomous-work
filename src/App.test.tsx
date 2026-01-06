/**
 * App Component Tests
 *
 * This file contains unit and integration tests for the App component.
 * It demonstrates how to use React Testing Library with Jest.
 */

import { render, screen, waitFor } from '@/utils/test-utils'
import App from './App'

describe('App Component', () => {
  it('renders the app header with correct title', () => {
    render(<App />)

    const heading = screen.getByRole('heading', { name: /pp-like/i })
    expect(heading).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    render(<App />)

    const subtitle = screen.getByText(/powerpoint-like web application/i)
    expect(subtitle).toBeInTheDocument()
  })

  it('renders the create presentation button', () => {
    render(<App />)

    const button = screen.getByTestId('create-presentation')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Create Presentation')
  })

  it('opens create presentation dialog when button is clicked', async () => {
    const { user } = render(<App />)

    const button = screen.getByTestId('create-presentation')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByTestId('create-presentation-dialog')).toBeInTheDocument()
    })
  })

  it('closes dialog when cancel is clicked', async () => {
    const { user } = render(<App />)

    // Open dialog
    await user.click(screen.getByTestId('create-presentation'))
    await waitFor(() => {
      expect(screen.getByTestId('create-presentation-dialog')).toBeInTheDocument()
    })

    // Click cancel
    await user.click(screen.getByTestId('dialog-cancel-button'))

    await waitFor(() => {
      expect(screen.queryByTestId('create-presentation-dialog')).not.toBeInTheDocument()
    })
  })

  it('creates a presentation with entered name', async () => {
    const { user } = render(<App />)

    // Open dialog
    await user.click(screen.getByTestId('create-presentation'))
    await waitFor(() => {
      expect(screen.getByTestId('create-presentation-dialog')).toBeInTheDocument()
    })

    // Enter name
    const input = screen.getByTestId('presentation-name-input')
    await user.type(input, 'My Test Presentation')

    // Click create
    await user.click(screen.getByTestId('dialog-create-button'))

    // Verify dialog closed and presentation created
    await waitFor(() => {
      expect(screen.queryByTestId('create-presentation-dialog')).not.toBeInTheDocument()
    })

    expect(screen.getByTestId('presentation-name')).toHaveTextContent('My Test Presentation')
  })

  it('shows error when trying to create with empty name', async () => {
    const { user } = render(<App />)

    // Open dialog
    await user.click(screen.getByTestId('create-presentation'))
    await waitFor(() => {
      expect(screen.getByTestId('create-presentation-dialog')).toBeInTheDocument()
    })

    // Click create without entering name
    await user.click(screen.getByTestId('dialog-create-button'))

    // Verify error is shown
    await waitFor(() => {
      expect(screen.getByTestId('input-error')).toBeInTheDocument()
    })

    // Dialog should still be open
    expect(screen.getByTestId('create-presentation-dialog')).toBeInTheDocument()
  })

  it('renders the footer with technology stack info', () => {
    render(<App />)

    // Check for the technology mentions
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('Vite')).toBeInTheDocument()
    expect(screen.getByText('Tailwind CSS')).toBeInTheDocument()
  })
})
