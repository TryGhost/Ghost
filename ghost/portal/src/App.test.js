import React from 'react';
import {render} from '@testing-library/react';
import App from './App';

test('renders App', () => {
    const {container} = render(
        <App />
    );

    // dashboard component should be rendered on root route
    const element = container.querySelector('.App');
    expect(element).toBeInTheDocument();
});