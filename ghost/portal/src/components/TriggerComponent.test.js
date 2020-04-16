import React from 'react';
import {render} from '@testing-library/react';
import TriggerComponent from './TriggerComponent';

describe('TriggerComponentTest', () => {
    test('renders', () => {
        const {getByTitle} = render(
            <TriggerComponent />
        );
        const triggerFrame = getByTitle('membersjs-trigger');

        expect(triggerFrame).toBeInTheDocument();
    });
});
