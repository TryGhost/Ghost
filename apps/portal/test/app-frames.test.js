import {render} from '@testing-library/react';
import {site} from '../src/utils/fixtures';
import App from '../src/app';

const setup = async () => {
    const testState = {
        site,
        member: null,
        action: 'init:success',
        brandColor: site.accent_color,
        page: 'signup',
        initStatus: 'success',
        showPopup: true,
        commentsIsLoading: false
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
