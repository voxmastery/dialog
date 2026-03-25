import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LevelBadge, MethodBadge, StatusBadge } from '../ui/Badge';

describe('LevelBadge', () => {
  it('renders ERROR badge', () => {
    render(<LevelBadge level="ERROR" />);
    expect(screen.getByText('ERROR')).toBeDefined();
  });
  it('renders null for null level', () => {
    const { container } = render(<LevelBadge level={null} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('MethodBadge', () => {
  it('renders GET badge', () => {
    render(<MethodBadge method="GET" />);
    expect(screen.getByText('GET')).toBeDefined();
  });
});

describe('StatusBadge', () => {
  it('renders status code', () => {
    render(<StatusBadge status={500} />);
    expect(screen.getByText('500')).toBeDefined();
  });
});
