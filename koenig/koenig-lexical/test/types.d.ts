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
}

declare module 'fs-extra' {
    import fs from 'fs';
    export = fs;
}
