import IframeBuffering from '@/settings/app/utils/iframe-buffering';
import {render, waitFor} from '@testing-library/react';

describe('IframeBuffering', () => {
    it('applies lightweight updates without regenerating the iframe contents', async () => {
        const generateContent = vi.fn();
        const initialUpdate = vi.fn();
        const nextUpdate = vi.fn();
        const {rerender} = render(
            <IframeBuffering generateContent={generateContent} updateContent={initialUpdate} />
        );

        await waitFor(() => {
            expect(generateContent).toHaveBeenCalledOnce();
            expect(initialUpdate).toHaveBeenCalledTimes(2);
        });

        rerender(
            <IframeBuffering generateContent={generateContent} updateContent={nextUpdate} />
        );

        await waitFor(() => {
            expect(nextUpdate).toHaveBeenCalledTimes(2);
        });
        expect(generateContent).toHaveBeenCalledOnce();
    });
});
