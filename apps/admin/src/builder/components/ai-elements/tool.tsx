import {Badge} from '@tryghost/shade/components';
import {Inline, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';

import {Task, TaskContent, TaskItem, TaskTrigger} from './task';

import type {BuilderConversationToolCall} from '@/builder/core/model-access';

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
    screenshot: 'Reviewing how the page looks'
};

function actionLabel(name: string): string {
    return actionLabels[name] ?? 'Working on your design';
}

export const ToolGroup = ({toolCalls}: {toolCalls: readonly BuilderConversationToolCall[]}) => {
    const running = toolCalls.some(toolCall => toolCall.status === 'running');
    const interrupted = toolCalls.some(toolCall => toolCall.status === 'interrupted');
    const failed = toolCalls.some(toolCall => toolCall.result?.ok === false);
    const label = running ? 'Making changes' : interrupted ? 'Work stopped' : failed ? 'Some changes need attention' : 'Changes complete';
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
                {toolCalls.map(toolCall => (
                    <TaskItem
                        key={toolCall.id}
                        icon={toolCall.status === 'running'
                            ? <LucideIcon.LoaderCircle aria-hidden='true' className='size-4 animate-spin text-muted-foreground motion-reduce:animate-none' />
                            : toolCall.status === 'interrupted'
                                ? <LucideIcon.CircleStop aria-hidden='true' className='size-4 text-muted-foreground' />
                                : toolCall.result?.ok === false
                                    ? <LucideIcon.CircleX aria-hidden='true' className='size-4 text-destructive' />
                                    : <LucideIcon.CircleCheck aria-hidden='true' className='text-success size-4' />}
                        status={toolCall.status === 'running' ? 'In progress' : toolCall.status === 'interrupted' ? 'Stopped' : toolCall.result?.ok === false ? 'Needs attention' : 'Done'}
                        title={actionLabel(toolCall.name)}
                    />
                ))}
            </TaskContent>
        </Task>
    );
};
