import EmbedSignupPreview from '@src/components/settings/growth/embed-signup/embed-signup-preview';
import {render, waitFor} from '@testing-library/react';

describe('EmbedSignupPreview', () => {
    it('generates the preview when its asynchronously loaded content arrives', async () => {
        const {container, rerender} = render(
            <EmbedSignupPreview backgroundColor="#08090c" html="" style="all-in-one" />
        );

        rerender(
            <EmbedSignupPreview
                backgroundColor="#08090c"
                html={'<div><script data-background-color="#08090c" src="/signup-form.js"></script></div>'}
                style="all-in-one"
            />
        );

        await waitFor(() => {
            const frames = Array.from(container.querySelectorAll('iframe'));
            expect(frames.some(frame => frame.contentDocument?.querySelector('script[src="/signup-form.js"]'))).toBe(true);
        });
    });
});
