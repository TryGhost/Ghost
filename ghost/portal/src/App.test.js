import React from 'react';
import {render} from '@testing-library/react';
import App from './App';
import {site} from './test/fixtures/data';

test('renders App', () => {
    const {container} = render(
        <App data={{site}} />
    );

    // dashboard component should be rendered on root route
    const element = container.querySelector('.App');
    expect(element).toBeInTheDocument();
});