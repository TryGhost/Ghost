import { LucideIcon } from '@tryghost/shade/utils';

import { Shimmer } from './shimmer';
import { Task, TaskContent, TaskItem, TaskTrigger } from './task';

import type {
  BuilderConversationMessage,
  BuilderConversationToolCall,
} from '@/builder/core/model-access';

const actionLabels: Record<string, string> = {
  list_files: 'Inspecting theme files',
  search_files: 'Searching theme files',
  read_file: 'Inspecting the template',
  replace_in_file: 'Editing the template',
  write_file: 'Editing the template',
  delete_file: 'Removing the template',
  list_design_settings: 'Inspecting design settings',
  update_design_settings: 'Editing design settings',
  read_html: 'Inspecting the artifact',
  find_in_html: 'Searching the artifact',
  replace_in_html: 'Editing the artifact',
  write_html: 'Editing the artifact',
  inspect: 'Inspecting the artifact preview',
  inspect_page: 'Inspecting the preview',
  inspect_element: 'Inspecting the selection',
  navigate: 'Opening the preview page',
  screenshot: 'Inspecting screenshot',
  read_attachment: 'Inspecting an attachment',
  search_attachment: 'Searching an attachment',
};

const fileMutationActions = new Set([
  'replace_in_file',
  'write_file',
  'delete_file',
  'replace_in_html',
  'write_html',
]);

function actionLabel(name: string): string {
  return actionLabels[name] ?? 'Working on your design';
}

function actionIcon(name: string) {
  const className = 'size-4 shrink-0 stroke-[1.5px] text-muted-foreground';

  switch (name) {
    case 'list_files':
      return <LucideIcon.Files aria-hidden="true" className={className} />;
    case 'search_files':
    case 'find_in_html':
    case 'search_attachment':
      return <LucideIcon.Search aria-hidden="true" className={className} />;
    case 'read_file':
      return <LucideIcon.FileText aria-hidden="true" className={className} />;
    case 'replace_in_file':
    case 'write_file':
      return <LucideIcon.FilePenLine aria-hidden="true" className={className} />;
    case 'delete_file':
      return <LucideIcon.Trash2 aria-hidden="true" className={className} />;
    case 'list_design_settings':
    case 'update_design_settings':
      return <LucideIcon.SlidersHorizontal aria-hidden="true" className={className} />;
    case 'read_html':
      return <LucideIcon.Code2 aria-hidden="true" className={className} />;
    case 'replace_in_html':
    case 'write_html':
      return <LucideIcon.Braces aria-hidden="true" className={className} />;
    case 'inspect':
    case 'inspect_page':
      return <LucideIcon.Eye aria-hidden="true" className={className} />;
    case 'inspect_element':
      return <LucideIcon.MousePointer2 aria-hidden="true" className={className} />;
    case 'navigate':
      return <LucideIcon.Compass aria-hidden="true" className={className} />;
    case 'screenshot':
      return <LucideIcon.Camera aria-hidden="true" className={className} />;
    case 'read_attachment':
      return <LucideIcon.Paperclip aria-hidden="true" className={className} />;
    default:
      return <LucideIcon.Sparkles aria-hidden="true" className={className} />;
  }
}

function actionTarget(toolCall: BuilderConversationToolCall): string | null {
  if (typeof toolCall.input.path === 'string') {
    return `file:${toolCall.input.path}`;
  }
  if (
    toolCall.name === 'update_design_settings' &&
    toolCall.input.values &&
    typeof toolCall.input.values === 'object' &&
    !Array.isArray(toolCall.input.values)
  ) {
    return `settings:${Object.keys(toolCall.input.values).sort().join('|')}`;
  }
  if (toolCall.name === 'replace_in_html' || toolCall.name === 'write_html') {
    return 'artifact:html';
  }
  return null;
}

function repairs(
  failedCall: BuilderConversationToolCall,
  laterCall: BuilderConversationToolCall,
): boolean {
  if (laterCall.status !== 'complete' || laterCall.result?.ok !== true) {
    return false;
  }
  const failedTarget = actionTarget(failedCall);
  const laterTarget = actionTarget(laterCall);
  if (failedTarget && laterTarget) {
    return (
      failedTarget === laterTarget &&
      (laterCall.name === failedCall.name ||
        (fileMutationActions.has(failedCall.name) && fileMutationActions.has(laterCall.name)))
    );
  }
  if (fileMutationActions.has(failedCall.name) || failedCall.name === 'update_design_settings') {
    return false;
  }
  return laterCall.name === failedCall.name;
}

export const ToolGroup = ({
  messageStatus,
  toolCalls,
}: {
  messageStatus?: BuilderConversationMessage['status'];
  toolCalls: readonly BuilderConversationToolCall[];
}) => {
  const interrupted =
    messageStatus === 'interrupted' ||
    toolCalls.some((toolCall) => toolCall.status === 'interrupted');
  const running =
    !interrupted &&
    (messageStatus === 'pending' || toolCalls.some((toolCall) => toolCall.status === 'running'));
  const unresolvedFailure = toolCalls.some((toolCall, index) => {
    if (toolCall.status !== 'complete' || toolCall.result?.ok !== false) {
      return false;
    }
    return !toolCalls.slice(index + 1).some((laterCall) => repairs(toolCall, laterCall));
  });
  const failed = !running && !interrupted && unresolvedFailure;
  const changed = toolCalls.some(
    (toolCall) =>
      (fileMutationActions.has(toolCall.name) || toolCall.name === 'update_design_settings') &&
      toolCall.status === 'complete' &&
      toolCall.result?.ok === true,
  );
  const label = running
    ? 'Making changes'
    : interrupted
      ? 'Work stopped'
      : failed
        ? 'Some changes need attention'
        : changed
          ? 'Changes complete'
          : 'Review complete';
  const status = interrupted ? 'Interrupted' : running ? 'Running' : failed ? 'Failed' : 'Complete';
  const latestToolCall = toolCalls.at(-1);
  const latestStep = latestToolCall ? actionLabel(latestToolCall.name) : label;
  const latestIcon = actionIcon(latestToolCall?.name ?? '');

  return (
    <Task>
      <TaskTrigger
        aria-label={`${latestStep}. ${label}. ${status}`}
        icon={latestIcon}
        title={running ? <Shimmer as="span">{latestStep}</Shimmer> : latestStep}
      />
      <TaskContent>
        {toolCalls.map((toolCall, index) => {
          const resolved =
            toolCall.result?.ok === false &&
            toolCalls.slice(index + 1).some((laterCall) => repairs(toolCall, laterCall));
          return (
            <TaskItem
              key={toolCall.id}
              icon={actionIcon(toolCall.name)}
              status={
                toolCall.status === 'running'
                  ? 'In progress'
                  : toolCall.status === 'interrupted'
                    ? 'Stopped'
                    : resolved
                      ? 'Retried'
                      : toolCall.result?.ok === false
                        ? 'Needs attention'
                        : undefined
              }
              title={actionLabel(toolCall.name)}
            />
          );
        })}
      </TaskContent>
    </Task>
  );
};
