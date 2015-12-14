// # Editor shortcuts
// Loaded by gh-editor component
// This map is used to ensure the right action is called by each shortcut
import ctrlOrCmd from 'ghost/utils/ctrl-or-cmd';

let shortcuts = {};

// Markdown Shortcuts

// Text
shortcuts['ctrl+alt+u'] = {action: 'editorShortcut', options: {type: 'strike'}};
shortcuts[`${ctrlOrCmd}+b`] = {action: 'editorShortcut', options: {type: 'bold'}};
shortcuts[`${ctrlOrCmd}+i`] = {action: 'editorShortcut', options: {type: 'italic'}};

shortcuts['ctrl+u'] = {action: 'editorShortcut', options: {type: 'uppercase'}};
shortcuts['ctrl+shift+u'] = {action: 'editorShortcut', options: {type: 'lowercase'}};
shortcuts['ctrl+alt+shift+u'] = {action: 'editorShortcut', options: {type: 'titlecase'}};
shortcuts[`${ctrlOrCmd}+shift+c`] = {action: 'editorShortcut', options: {type: 'copyHTML'}};
shortcuts[`${ctrlOrCmd}+h`] = {action: 'editorShortcut', options: {type: 'cycleHeaderLevel'}};

// Formatting
shortcuts['ctrl+q'] = {action: 'editorShortcut', options: {type: 'blockquote'}};
shortcuts['ctrl+l'] = {action: 'editorShortcut', options: {type: 'list'}};

// Insert content
shortcuts['ctrl+shift+1'] = {action: 'editorShortcut', options: {type: 'currentDate'}};
shortcuts[`${ctrlOrCmd}+k`] = {action: 'editorShortcut', options: {type: 'link'}};
shortcuts[`${ctrlOrCmd}+shift+i`] = {action: 'editorShortcut', options: {type: 'image'}};
shortcuts[`${ctrlOrCmd}+shift+k`] = {action: 'editorShortcut', options: {type: 'code'}};

export default shortcuts;
