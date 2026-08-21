import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {ToolGroup} from './tool';

describe('ToolGroup', () => {
    it('keeps the latest step shimmering while the turn is still in progress between tool calls', () => {
        const {container} = render(<ToolGroup messageStatus='pending' toolCalls={[{
            id: 'completed-tool',
            name: 'read_file',
            input: {path: 'index.hbs'},
            status: 'complete',
            result: {ok: true, revision: 'revision-1', data: {}}
        }]} />);

        expect(container.querySelector('.builder-shimmer')).toHaveTextContent('Inspecting the template');
    });

    it('presents failed work without exposing internal tool details', () => {
        render(<ToolGroup toolCalls={[{
            id: 'failed-tool',
            name: 'write_file',
            input: {path: 'index.hbs'},
            status: 'complete',
            result: {ok: false, revision: 'revision-1', error: {code: 'render_failed', message: 'Template error', retryable: true}}
        }]} />);

        fireEvent.click(screen.getByLabelText('Editing the template. Some changes need attention. Failed'));
        expect(screen.getAllByText('Editing the template')).toHaveLength(2);
        expect(screen.getByText('Needs attention')).toBeVisible();
        expect(screen.queryByText('write_file')).not.toBeInTheDocument();
        expect(screen.queryByText('Template error')).not.toBeInTheDocument();
    });

    it('summarizes completed visual checks without rendering result payloads', () => {
        const image = 'A'.repeat(20_000);
        const {container} = render(<ToolGroup toolCalls={[{
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

        const trigger = screen.getByLabelText('Inspecting screenshot. Review complete. Complete');
        expect(trigger.querySelector('.lucide-chevron-right')).toHaveClass('opacity-0', 'group-hover/trigger:opacity-100', 'group-open:rotate-90');
        expect(trigger.querySelector('.lucide-camera')).toHaveClass('stroke-[1.5px]');
        fireEvent.click(trigger);
        expect(screen.queryByText(image)).not.toBeInTheDocument();
        expect(screen.getAllByText('Inspecting screenshot')).toHaveLength(2);
        expect(container.querySelectorAll('.lucide-camera')).toHaveLength(2);
        expect(screen.queryByText('Done')).not.toBeInTheDocument();
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

        fireEvent.click(screen.getByLabelText('Editing the artifact. Changes complete. Complete'));
        expect(screen.getAllByText('Editing the artifact')).toHaveLength(2);
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

        expect(screen.getByLabelText('Editing the template. Work stopped. Interrupted')).toBeInTheDocument();
    });

    it('gives an interrupted tool precedence while the turn is still settling', () => {
        render(<ToolGroup messageStatus='pending' toolCalls={[{
            id: 'interrupted-tool',
            name: 'write_file',
            input: {},
            status: 'interrupted'
        }]} />);

        expect(screen.getByLabelText('Editing the template. Work stopped. Interrupted')).toBeInTheDocument();
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

        const task = screen.getByLabelText('Editing the template. Changes complete. Complete');
        expect(task).toBeInTheDocument();
        fireEvent.click(task);
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

        expect(screen.getByLabelText('Inspecting the preview. Some changes need attention. Failed')).toBeInTheDocument();
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

        expect(screen.getByLabelText('Editing the template. Some changes need attention. Failed')).toBeInTheDocument();
    });
});
