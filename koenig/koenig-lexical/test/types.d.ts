interface KoenigTestEditor {
    blur(): void;
    setEditorState(state: unknown): void;
    getEditorState(): {toJSON(): unknown};
    parseEditorState(state: unknown): unknown;
    update(fn: () => void): void;
    dispatchCommand(command: unknown, payload: unknown): void;
}

declare interface Window {
    lexicalEditor: KoenigTestEditor;
    originalEditorState: unknown;
    navigate: (path: string) => void;
    // set by bookmark-loading.test.ts's stubbed fetchEmbed
    finishBookmarkRequest: () => void;
    failBookmarkRequest: () => void;
}

declare module 'fs-extra' {
    import fs from 'fs';
    export = fs;
}
