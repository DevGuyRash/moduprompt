import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  test('renders ModuPrompt header', () => {
    render(<App />);
    const headerElement = screen.getByText(/ModuPrompt/i);
    expect(headerElement).toBeInTheDocument();
  });

  test('renders Notebook Mode button', () => {
    render(<App />);
    const notebookButton = screen.getByText(/Notebook Mode/i);
    expect(notebookButton).toBeInTheDocument();
  });

  test('renders Node Mode button', () => {
    render(<App />);
    const nodeButton = screen.getByText(/Node Mode/i);
    expect(nodeButton).toBeInTheDocument();
  });
});
