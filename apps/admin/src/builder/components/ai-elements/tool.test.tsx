import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {ToolGroup} from './tool';

describe('ToolGroup', () => {
    it('marks failed tool results as failed', () => {
        render(<ToolGroup toolCalls={[{
            id: 'failed-tool',
            name: 'write_file',
            input: {path: 'index.hbs'},
            status: 'complete',
            result: {ok: false, revision: 'revision-1', error: {code: 'render_failed', message: 'Template error', retryable: true}}
        }]} />);

        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.queryByText('Complete')).not.toBeInTheDocument();
    });

    it('omits image payloads and truncates large results', () => {
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

        fireEvent.click(screen.getByText('1 tool action'));
        expect(screen.queryByText(image)).not.toBeInTheDocument();
        expect(screen.getByText(/image payload omitted/)).toBeInTheDocument();
        expect(screen.getByText(/result truncated/)).toBeInTheDocument();
    });
});
