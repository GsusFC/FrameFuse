import { render, screen } from '@testing-library/react';
import React from 'react';
import { App } from './App';

describe('App', () => {
  it('renders header and panels', () => {
    render(<App />);
    expect(screen.getByText('FrameFuse')).toBeInTheDocument();
    expect(screen.getByText('Añadir imágenes')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Preview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Exportar' })).toBeInTheDocument();
  });
});


