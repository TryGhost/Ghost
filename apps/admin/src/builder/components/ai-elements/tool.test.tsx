import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {ToolGroup} from './tool';

describe('ToolGroup', () => {
    it('presents failed work without exposing internal tool details', () => {
        render(<ToolGroup toolCalls={[{
            id: 'failed-tool',
            name: 'write_file',
            input: {path: 'index.hbs'},
            status: 'complete',
            result: {ok: false, revision: 'revision-1', error: {code: 'render_failed', message: 'Template error', retryable: true}}
        }]} />);

        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.queryByText('Complete')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('Some changes need attention'));
        expect(screen.getByText('Saving design changes')).toBeVisible();
        expect(screen.getByText('Needs attention')).toBeVisible();
        expect(screen.queryByText('write_file')).not.toBeInTheDocument();
        expect(screen.queryByText('Template error')).not.toBeInTheDocument();
    });

    it('summarizes completed visual checks without rendering result payloads', () => {
        const image = 'A'.repeat(20_000);
        render(<ToolGroup toolCalls={[{
            id: 'screenshot-tool',
            name: 'screenshot',
            input: {kind: 'viewport'},
            status: 'complete',
            result: {
                ok: true,
                revision: 'revision-1',
                data: {description: 'B'.repeat(20_000)},
                attachments: [{type: 'image', mediaType: 'image/png', data: image}]
            }
        }]} />);

        fireEvent.click(screen.getByText('Changes complete'));
        expect(screen.queryByText(image)).not.toBeInTheDocument();
        expect(screen.getByText('Reviewing how the page looks')).toBeVisible();
        expect(screen.queryByText(/image payload omitted/)).not.toBeInTheDocument();
        expect(screen.queryByText(/result truncated/)).not.toBeInTheDocument();
    });
});
