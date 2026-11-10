export class LabelAddedToMembersEvent {
  readonly timestamp = new Date();
  readonly data: {
    readonly labelId: string;
    readonly memberIds: readonly string[];
  };

  constructor(labelId: string, memberIds: readonly string[]) {
    this.data = { labelId, memberIds: [...memberIds] };
  }
}
