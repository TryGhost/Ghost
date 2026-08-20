import {Badge} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {formatNumber, LucideIcon} from '@tryghost/shade/utils';

import type {BuilderConversationToolCall} from '@/builder/core/model-access';

const maxResultCharacters = 8_000;

function resultText(toolCall: BuilderConversationToolCall): string {
    if (!toolCall.result) {
        return 'Waiting for a result';
    }
    try {
        const displayResult = toolCall.result.ok && toolCall.result.attachments ? (() => {
            const {attachments, ...result} = toolCall.result;
            return {
                attachments: attachments.map(attachment => ({
                    ...attachment,
                    data: `[image payload omitted: ${formatNumber(attachment.data.length)} base64 characters]`
                })),
                ...result
            };
        })() : toolCall.result;
        const result = JSON.stringify(displayResult, null, 2);
        return result.length > maxResultCharacters ? `${result.slice(0, maxResultCharacters)}\n… [result truncated]` : result;
    } catch {
        return 'The result could not be displayed.';
    }
}

export const ToolGroup = ({toolCalls}: {toolCalls: readonly BuilderConversationToolCall[]}) => {
    const running = toolCalls.some(toolCall => toolCall.status === 'running');
    const interrupted = toolCalls.some(toolCall => toolCall.status === 'interrupted');
    const failed = toolCalls.some(toolCall => toolCall.result?.ok === false);
    const label = `${formatNumber(toolCalls.length)} tool ${toolCalls.length === 1 ? 'action' : 'actions'}`;
    const status = interrupted ? 'Interrupted' : running ? 'Running' : failed ? 'Failed' : 'Complete';

    return (
        <details className='group overflow-hidden rounded-md border border-border-default bg-surface-elevated'>
            <summary className='cursor-pointer list-none px-3 py-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-hidden'>
                <Inline align='center' gap='sm' justify='between'>
                    <Inline align='center' gap='sm'>
                        <LucideIcon.Wrench aria-hidden='true' className='size-4 text-muted-foreground' />
                        <Text size='sm' weight='medium'>{label}</Text>
                        <Badge variant={failed ? 'destructive' : interrupted ? 'warning' : running ? 'secondary' : 'success'}>
                            {status}
                        </Badge>
                    </Inline>
                    <LucideIcon.ChevronDown aria-hidden='true' className='size-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none' />
                </Inline>
            </summary>
            <Stack className='border-t border-border-default p-3' gap='md'>
                {toolCalls.map(toolCall => (
                    <Stack key={toolCall.id} gap='xs'>
                        <Inline align='center' gap='sm' justify='between'>
                            <Text size='sm' weight='medium'>{toolCall.name}</Text>
                            <Text size='sm' tone='secondary'>{toolCall.status}</Text>
                        </Inline>
                        <pre className='max-h-48 overflow-auto rounded-sm bg-background p-2 text-xs whitespace-pre-wrap text-muted-foreground'>{resultText(toolCall)}</pre>
                    </Stack>
                ))}
            </Stack>
        </details>
    );
};
