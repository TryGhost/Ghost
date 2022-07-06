import {render} from '@testing-library/react';
import App from './App';
import React from 'react';

test('renders Sodo Search app component', () => {
    window.location.hash = '#/sodo-search';
    render(<App />);
    // const containerElement = screen.getElementsByClassName('gh-portal-popup-container');
    const containerElement = document.querySelector('.gh-root-frame');
    expect(containerElement).toBeInTheDocument();
});
