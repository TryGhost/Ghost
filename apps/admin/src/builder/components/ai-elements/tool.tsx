import {Badge} from '@tryghost/shade/components';
import {Inline, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';

import {Task, TaskContent, TaskItem, TaskTrigger} from './task';

import type {BuilderConversationMessage, BuilderConversationToolCall} from '@/builder/core/model-access';

const actionLabels: Record<string, string> = {
    list_files: 'Reviewing the theme',
    search_files: 'Finding the right place to make changes',
    read_file: 'Reviewing the current design',
    replace_in_file: 'Updating the design',
    write_file: 'Saving design changes',
    delete_file: 'Removing an unused part of the design',
    list_design_settings: 'Reviewing design settings',
    update_design_settings: 'Updating design settings',
    inspect_page: 'Checking the preview',
    inspect_element: 'Checking the selected area',
    navigate: 'Opening another preview page',
    screenshot: 'Reviewing how the page looks',
    read_attachment: 'Reviewing an attachment',
    search_attachment: 'Finding information in an attachment'
};

const fileMutationActions = new Set([
    'replace_in_file',
    'write_file',
    'delete_file'
]);

function actionLabel(name: string): string {
    return actionLabels[name] ?? 'Working on your design';
}

function actionTarget(toolCall: BuilderConversationToolCall): string | null {
    if (typeof toolCall.input.path === 'string') {
        return `file:${toolCall.input.path}`;
    }
    if (toolCall.name === 'update_design_settings' && toolCall.input.values && typeof toolCall.input.values === 'object' && !Array.isArray(toolCall.input.values)) {
        return `settings:${Object.keys(toolCall.input.values).sort().join('|')}`;
    }
    return null;
}

function repairs(failedCall: BuilderConversationToolCall, laterCall: BuilderConversationToolCall): boolean {
    if (laterCall.status !== 'complete' || laterCall.result?.ok !== true) {
        return false;
    }
    const failedTarget = actionTarget(failedCall);
    const laterTarget = actionTarget(laterCall);
    if (failedTarget && laterTarget) {
        return failedTarget === laterTarget
            && (laterCall.name === failedCall.name || (fileMutationActions.has(failedCall.name) && fileMutationActions.has(laterCall.name)));
    }
    if (fileMutationActions.has(failedCall.name) || failedCall.name === 'update_design_settings') {
        return false;
    }
    return laterCall.name === failedCall.name;
}

export const ToolGroup = ({messageStatus, toolCalls}: {messageStatus?: BuilderConversationMessage['status']; toolCalls: readonly BuilderConversationToolCall[]}) => {
    const interrupted = messageStatus === 'interrupted' || toolCalls.some(toolCall => toolCall.status === 'interrupted');
    const running = !interrupted && (messageStatus === 'pending' || toolCalls.some(toolCall => toolCall.status === 'running'));
    const unresolvedFailure = toolCalls.some((toolCall, index) => {
        if (toolCall.status !== 'complete' || toolCall.result?.ok !== false) {
            return false;
        }
        return !toolCalls.slice(index + 1).some(laterCall => repairs(toolCall, laterCall));
    });
    const failed = !running && !interrupted && unresolvedFailure;
    const changed = toolCalls.some(toolCall => (fileMutationActions.has(toolCall.name) || toolCall.name === 'update_design_settings') && toolCall.status === 'complete' && toolCall.result?.ok === true);
    const label = running ? 'Making changes' : interrupted ? 'Work stopped' : failed ? 'Some changes need attention' : changed ? 'Changes complete' : 'Review complete';
    const status = interrupted ? 'Interrupted' : running ? 'Running' : failed ? 'Failed' : 'Complete';

    return (
        <Task>
            <TaskTrigger>
                <Inline align='center' gap='sm'>
                    <LucideIcon.ListChecks aria-hidden='true' className='size-4 text-muted-foreground' />
                    <Text size='sm' weight='medium'>{label}</Text>
                    <Badge variant={failed ? 'destructive' : interrupted ? 'warning' : running ? 'secondary' : 'success'}>
                        {status}
                    </Badge>
                </Inline>
            </TaskTrigger>
            <TaskContent>
                {toolCalls.map((toolCall, index) => {
                    const resolved = toolCall.result?.ok === false && toolCalls.slice(index + 1).some(laterCall => repairs(toolCall, laterCall));
                    return (
                    <TaskItem
                        key={toolCall.id}
                        icon={toolCall.status === 'running'
                            ? <LucideIcon.LoaderCircle aria-hidden='true' className='size-4 animate-spin text-muted-foreground motion-reduce:animate-none' />
                            : toolCall.status === 'interrupted'
                                ? <LucideIcon.CircleStop aria-hidden='true' className='size-4 text-muted-foreground' />
                                : toolCall.result?.ok === false && !resolved
                                    ? <LucideIcon.CircleX aria-hidden='true' className='size-4 text-destructive' />
                                    : <LucideIcon.CircleCheck aria-hidden='true' className='text-success size-4' />}
                        status={toolCall.status === 'running' ? 'In progress' : toolCall.status === 'interrupted' ? 'Stopped' : resolved ? 'Retried' : toolCall.result?.ok === false ? 'Needs attention' : 'Done'}
                        title={actionLabel(toolCall.name)}
                    />
                    );
                })}
            </TaskContent>
        </Task>
    );
};
