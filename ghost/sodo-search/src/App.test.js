import {render} from '@testing-library/react';
import App from './App';
import React from 'react';

test('renders Sodo Search app component', () => {
    window.location.hash = '#/search';
    render(<App adminUrl="http://localhost" apiKey="69010382388f9de5869ad6e558" />);
    // const containerElement = screen.getElementsByClassName('gh-portal-popup-container');
    const containerElement = document.querySelector('.gh-root-frame');
    expect(containerElement).toBeInTheDocument();
});
