import React from 'react';
import {render} from '@testing-library/react';
import TriggerButton from './TriggerButton';

describe('Trigger Button', () => {
    test('renders', () => {
        const {getByTitle} = render(
            <TriggerButton />
        );
        const triggerFrame = getByTitle('membersjs-trigger');

        expect(triggerFrame).toBeInTheDocument();
    });
});
