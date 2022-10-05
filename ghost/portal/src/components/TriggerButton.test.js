import React from 'react';
import {render} from '../utils/test-utils';
import TriggerButton from './TriggerButton';

const setup = (overrides) => {
    const {mockOnActionFn, ...utils} = render(
        <TriggerButton />
    );

    const triggerFrame = utils.getByTitle('portal-trigger');
    return {
        triggerFrame,
        ...utils
    };
};

describe('Trigger Button', () => {
    test('renders', () => {
        const {triggerFrame} = setup();

        expect(triggerFrame).toBeInTheDocument();
    });
});
