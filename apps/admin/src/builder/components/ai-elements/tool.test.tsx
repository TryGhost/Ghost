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

        fireEvent.click(screen.getByText('Review complete'));
        expect(screen.queryByText(image)).not.toBeInTheDocument();
        expect(screen.getByText('Reviewing how the page looks')).toBeVisible();
        expect(screen.queryByText(/image payload omitted/)).not.toBeInTheDocument();
        expect(screen.queryByText(/result truncated/)).not.toBeInTheDocument();
    });

    it('describes Artifact HTML work in reader-friendly terms', () => {
        render(<ToolGroup messageStatus='complete' toolCalls={[{
            id: 'artifact-tool',
            name: 'write_html',
            input: {html: '<!doctype html>'},
            status: 'complete',
            result: {ok: true, revision: 'revision-2', data: {}}
        }]} />);

        fireEvent.click(screen.getByText('Changes complete'));
        expect(screen.getByText('Building the embed')).toBeVisible();
        expect(screen.queryByText('write_html')).not.toBeInTheDocument();
    });

    it('does not claim changes completed when the containing turn was interrupted', () => {
        render(<ToolGroup messageStatus='interrupted' toolCalls={[{
            id: 'completed-tool',
            name: 'write_file',
            input: {path: 'index.hbs'},
            status: 'complete',
            result: {ok: true, revision: 'revision-1', data: {}}
        }]} />);

        expect(screen.getByText('Work stopped')).toBeInTheDocument();
        expect(screen.getByText('Interrupted')).toBeInTheDocument();
        expect(screen.queryByText('Changes complete')).not.toBeInTheDocument();
    });

    it('gives an interrupted tool precedence while the turn is still settling', () => {
        render(<ToolGroup messageStatus='pending' toolCalls={[{
            id: 'interrupted-tool',
            name: 'write_file',
            input: {},
            status: 'interrupted'
        }]} />);

        expect(screen.getByText('Work stopped')).toBeInTheDocument();
        expect(screen.getByText('Interrupted')).toBeInTheDocument();
        expect(screen.queryByText('Making changes')).not.toBeInTheDocument();
    });

    it('summarizes the final repaired outcome instead of an earlier failed attempt', () => {
        render(<ToolGroup messageStatus='complete' toolCalls={[
            {
                id: 'failed-tool',
                name: 'replace_in_file',
                input: {path: 'index.hbs'},
                status: 'complete',
                result: {ok: false, revision: 'revision-1', error: {code: 'render_failed', message: 'Try again', retryable: true}}
            },
            {
                id: 'repaired-tool',
                name: 'replace_in_file',
                input: {path: 'index.hbs'},
                status: 'complete',
                result: {ok: true, revision: 'revision-2', data: {}}
            }
        ]} />);

        expect(screen.getByText('Changes complete')).toBeInTheDocument();
        expect(screen.getByText('Complete')).toBeInTheDocument();
        expect(screen.queryByText('Some changes need attention')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('Changes complete'));
        expect(screen.getByText('Retried')).toBeVisible();
        expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
    });

    it('does not treat a later successful inspection as repairing a failed change', () => {
        render(<ToolGroup messageStatus='complete' toolCalls={[
            {
                id: 'failed-change',
                name: 'write_file',
                input: {},
                status: 'complete',
                result: {ok: false, revision: 'revision-1', error: {code: 'render_failed', message: 'Try again', retryable: true}}
            },
            {
                id: 'successful-inspection',
                name: 'inspect_page',
                input: {},
                status: 'complete',
                result: {ok: true, revision: 'revision-1', data: {}}
            }
        ]} />);

        expect(screen.getByText('Some changes need attention')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('does not treat a successful change to another file as a repair', () => {
        render(<ToolGroup messageStatus='complete' toolCalls={[
            {
                id: 'failed-change',
                name: 'write_file',
                input: {path: 'index.hbs'},
                status: 'complete',
                result: {ok: false, revision: 'revision-1', error: {code: 'render_failed', message: 'Try again', retryable: true}}
            },
            {
                id: 'unrelated-change',
                name: 'write_file',
                input: {path: 'post.hbs'},
                status: 'complete',
                result: {ok: true, revision: 'revision-2', data: {}}
            }
        ]} />);

        expect(screen.getByText('Some changes need attention')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
    });
});
