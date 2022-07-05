import {render, screen} from '@testing-library/react';
import App from './App';
import React from 'react';

test('renders Sodo Search app component', () => {
    render(<App />);
    const linkElement = screen.getByText(/Sodo Search/i);
    expect(linkElement).toBeInTheDocument();
});
