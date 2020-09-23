import React from 'react';
import {render} from '@testing-library/react';
import {site, member} from './utils/fixtures';
import App from './App';

const setup = (overrides) => {
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
    const triggerButtonFrame = utils.getByTitle(/membersjs-trigger/i);
    const popupFrame = utils.getByTitle(/membersjs-popup/i);
    return {
        popupFrame,
        triggerButtonFrame,
        ...utils
    };
};

describe('App', () => {
    test('renders popup and trigger frames', () => {
        const {popupFrame, triggerButtonFrame} = setup();

        expect(popupFrame).toBeInTheDocument();
        expect(triggerButtonFrame).toBeInTheDocument();
    });
});