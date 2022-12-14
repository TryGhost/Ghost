import React from 'react';
import {render} from '@testing-library/react';
import {site} from './utils/fixtures';
import App from './App';

const setup = async (overrides) => {
    const testState = {
        site,
        member: null,
        action: 'init:success',
        brandColor: site.accent_color,
        page: 'signup',
        initStatus: 'success',
        showPopup: true
    };
    const {...utils} = render(
        <App testState={testState} />
    );

    const triggerButtonFrame = await utils.findByTitle(/portal-trigger/i);
    const popupFrame = await utils.findByTitle(/portal-popup/i);
    return {
        popupFrame,
        triggerButtonFrame,
        ...utils
    };
};

describe.skip('App', () => {
    test('renders popup and trigger frames', async () => {
        const {popupFrame, triggerButtonFrame} = await setup();

        expect(popupFrame).toBeInTheDocument();
        expect(triggerButtonFrame).toBeInTheDocument();
    });
});
