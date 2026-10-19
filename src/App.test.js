import { render, screen } from '@testing-library/react';
import App from './App';

test('renders snake game title', () => {
  render(<App />);
  const titleElement = screen.getByText(/snake/i);
  expect(titleElement).toBeInTheDocument();
});
