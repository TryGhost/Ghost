// # Editor shortcuts
// Loaded by EditorBaseRoute, which is a shortcuts route
// This map is used to ensure the right action is called by each shortcut
import ctrlOrCmd from 'ghost/utils/ctrl-or-cmd';

var shortcuts = {};

// General editor shortcuts
shortcuts[ctrlOrCmd + '+alt+p'] = 'publish';
shortcuts['alt+shift+z'] = 'toggleZenMode';

// Markdown Shortcuts

// Text
shortcuts['ctrl+alt+u'] = {action: 'textEditorShortcut', options: {type: 'strike'}};
shortcuts[ctrlOrCmd + '+b'] = {action: 'textEditorShortcut', options: {type: 'bold'}};
shortcuts[ctrlOrCmd + '+i'] = {action: 'textEditorShortcut', options: {type: 'italic'}};

shortcuts['ctrl+u'] = {action: 'textEditorShortcut', options: {type: 'uppercase'}};
shortcuts['ctrl+shift+u'] = {action: 'textEditorShortcut', options: {type: 'lowercase'}};
shortcuts['ctrl+alt+shift+u'] = {action: 'textEditorShortcut', options: {type: 'titlecase'}};
shortcuts[ctrlOrCmd + '+shift+c'] = {action: 'textEditorShortcut', options: {type: 'copyHTML'}};
shortcuts[ctrlOrCmd + '+h'] = {action: 'textEditorShortcut', options: {type: 'cycleHeaderLevel'}};

// Formatting
shortcuts['ctrl+q'] = {action: 'textEditorShortcut', options: {type: 'blockquote'}};
shortcuts['ctrl+l'] = {action: 'textEditorShortcut', options: {type: 'list'}};

// Insert content
shortcuts['ctrl+shift+1'] = {action: 'textEditorShortcut', options: {type: 'currentDate'}};
shortcuts[ctrlOrCmd + '+k'] = {action: 'textEditorShortcut', options: {type: 'link'}};
shortcuts[ctrlOrCmd + '+shift+i'] = {action: 'textEditorShortcut', options: {type: 'image'}};
shortcuts[ctrlOrCmd + '+shift+k'] = {action: 'textEditorShortcut', options: {type: 'code'}};

export default shortcuts;
