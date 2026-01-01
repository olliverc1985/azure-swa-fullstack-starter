import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './badge'

describe('Badge Component', () => {
  it('should render with default variant', () => {
    render(<Badge>Default Badge</Badge>)
    
    const badge = screen.getByText('Default Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('text-blue-700')
  })

  it('should render with success variant', () => {
    render(<Badge variant="success">Success</Badge>)
    
    const badge = screen.getByText('Success')
    expect(badge).toHaveClass('text-green-700')
  })

  it('should render with warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>)
    
    const badge = screen.getByText('Warning')
    expect(badge).toHaveClass('text-amber-700')
  })

  it('should render with error variant', () => {
    render(<Badge variant="error">Error</Badge>)
    
    const badge = screen.getByText('Error')
    expect(badge).toHaveClass('text-red-700')
  })

  it('should render with info variant', () => {
    render(<Badge variant="info">Info</Badge>)
    
    const badge = screen.getByText('Info')
    expect(badge).toHaveClass('text-blue-700')
  })

  it('should render with secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    
    const badge = screen.getByText('Secondary')
    expect(badge).toHaveClass('text-accent-700')
  })

  it('should render with outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>)
    
    const badge = screen.getByText('Outline')
    expect(badge).toHaveClass('border')
  })

  it('should apply custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>)
    
    const badge = screen.getByText('Custom')
    expect(badge).toHaveClass('custom-class')
  })

  it('should pass through additional props', () => {
    render(<Badge data-testid="test-badge">Test</Badge>)
    
    expect(screen.getByTestId('test-badge')).toBeInTheDocument()
  })
})
