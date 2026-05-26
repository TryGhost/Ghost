export type AutomationEditState =
  | 'idle'
  | 'saving'
  | 'publishing'
  | 're-publishing'
  | 'unpublishing'
  | 'confirming unpublish'
  | 'confirming re-publish'
  | 'failed to save'
  | 'failed to publish'
  | 'failed to re-publish'
  | 'failed to unpublish';
