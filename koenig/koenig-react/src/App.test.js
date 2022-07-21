import {render, screen} from '@testing-library/react';
import App from './App';

test('renders The Editor!', () => {
    render(<App />);
    const linkElement = screen.getByText(/The Editor!/i);
    expect(linkElement).toBeInTheDocument();
});