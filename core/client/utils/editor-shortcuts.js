var shortcuts = {},
    ctrlOrCmd = navigator.userAgent.indexOf('Mac') !== -1 ? 'command' : 'ctrl';
//
//General editor shortcuts
//

shortcuts[ctrlOrCmd + '+s'] = 'save';
shortcuts[ctrlOrCmd + '+alt+p'] = 'publish';
shortcuts['alt+shift+z'] = 'toggleZenMode';

//
//CodeMirror Markdown Shortcuts
//

//Text
shortcuts['ctrl+alt+u'] = {action: 'codeMirrorShortcut', options: {type: 'strike'}};
shortcuts[ctrlOrCmd + '+b'] = {action: 'codeMirrorShortcut', options: {type: 'bold'}};
shortcuts[ctrlOrCmd + '+i'] = {action: 'codeMirrorShortcut', options: {type: 'italic'}};

shortcuts['ctrl+U'] = {action: 'codeMirrorShortcut', options: {type: 'uppercase'}};
shortcuts['ctrl+shift+U'] = {action: 'codeMirrorShortcut', options: {type: 'lowercase'}};
shortcuts['ctrl+alt+shift+U'] = {action: 'codeMirrorShortcut', options: {type: 'titlecase'}};


//Headings
shortcuts['ctrl+alt+1'] = {action: 'codeMirrorShortcut', options: {type: 'h1'}};
shortcuts['ctrl+alt+2'] = {action: 'codeMirrorShortcut', options: {type: 'h2'}};
shortcuts['ctrl+alt+3'] = {action: 'codeMirrorShortcut', options: {type: 'h3'}};
shortcuts['ctrl+alt+4'] = {action: 'codeMirrorShortcut', options: {type: 'h4'}};
shortcuts['ctrl+alt+5'] = {action: 'codeMirrorShortcut', options: {type: 'h5'}};
shortcuts['ctrl+alt+6'] = {action: 'codeMirrorShortcut', options: {type: 'h6'}};

//Formatting
shortcuts['ctrl+q'] = {action: 'codeMirrorShortcut', options: {type: 'blockquote'}};
shortcuts['ctrl+l'] = {action: 'codeMirrorShortcut', options: {type: 'list'}};

//Insert content
shortcuts['ctrl+shift+1'] = {action: 'codeMirrorShortcut', options: {type: 'currentDate'}};
shortcuts[ctrlOrCmd + '+k'] = {action: 'codeMirrorShortcut', options: {type: 'link'}};
shortcuts[ctrlOrCmd + '+shift+i'] = {action: 'codeMirrorShortcut', options: {type: 'image'}};

//Currently broken CodeMirror Markdown shortcuts.
// Some may be broken due to a conflict with CodeMirror commands.
// (see http://codemirror.net/doc/manual.html#commands)
//
//shortcuts[ctrlOrCmd + '+c'] = {action: 'codeMirrorShortcut', options: {type: 'copyHTML'}};

export default shortcuts;
