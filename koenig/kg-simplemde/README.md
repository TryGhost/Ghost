# SimpleMDE - Markdown Editor
A drop-in JavaScript textarea replacement for writing beautiful and understandable markdown. The WYSIWYG-esque editor allows users to modify the markdown with toolbar buttons and shortcuts. WYSIWYG editors that produce HTML are often complex and buggy. Markdown solves this problem in many ways, but is less visually clear while editing. SimpleMDE has been designed to bridge this gap for non-technical users who are less familiar with or just learning markdown syntax.

[Demo](http://nextstepwebs.github.io/simplemde-markdown-editor)

[![Preview](http://i.imgur.com/b9hFHFT.png)](http://nextstepwebs.github.io/simplemde-markdown-editor)

## Quick start
SimpleMDE is available on [jsDelivr](http://www.jsdelivr.com/#!simplemde). Font Awesome is available on MaxCDN. *Please note, jsDelivr may take a few days to update to the latest release.*

```HTML
<link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/font-awesome/latest/css/font-awesome.min.css">
<link rel="stylesheet" href="//cdn.jsdelivr.net/simplemde/latest/simplemde.min.css">
<script src="//cdn.jsdelivr.net/simplemde/latest/simplemde.min.js"></script>
```

And then load SimpleMDE on the first textarea on a page

```HTML
<script>
var simplemde = new SimpleMDE();
simplemde.render();
</script>
```

#### Use a specific textarea

Pure JavaScript method

```HTML
<script>
var simplemde = new SimpleMDE({ element: document.getElementById("MyID") });
simplemde.render();
</script>
```

jQuery method

```HTML
<script>
var simplemde = new SimpleMDE({ element: $("#MyID")[0] });
simplemde.render();
</script>
```

## Get the content

```JavaScript
simplemde.value();
```

## Configuration

- **element**: The DOM element for the textarea to use. Defaults to the first textarea on the page.
- **status**: If set to `false`, hide the status bar. Defaults to `true`.
  - Optionally, you can set an array of status bar elements to include, and in what order.
- **toolbar**: If set to `false`, hide the toolbar. Defaults to the [array of icons](#toolbar-icons).
- **toolbarTips**: If set to `false`, disable toolbar button tips. Defaults to `true`.
- **toolbarGuideIcon**: If set to `false`, disable guide icon in the toolbar. Defaults to `true`.
- **autofocus**: If set to `true`, autofocuses the editor. Defaults to `false`.
- **lineWrapping**: If set to `false`, disable line wrapping. Defaults to `true`.
- **indentWithTabs**: If set to `false`, indent using spaces instead of tabs. Defaults to `true`.
- **tabSize**: If set, customize the tab size. Defaults to `2`.
- **spellChecker**: If set to `false`, disable the spell checker. Defaults to `true`.
- **autosave**: *Saves the text that's being written. It will forget the text when the form is submitted.*
  - **enabled**: If set to `true`, autosave the text. Defaults to `false`.
  - **unique_id**: You must set a unique identifier so that SimpleMDE can autosave. Something that separates this from other textareas.
  - **delay**: Delay between saves, in milliseconds. Defaults to `10000` (10s).

```JavaScript
var simplemde = new SimpleMDE({
	element: document.getElementById("MyID"),
	status: false,
	status: ['autosave', 'lines', 'words', 'cursor'], // Optional usage
	toolbar: false,
	autofocus: true,
	lineWrapping: false,
	indentWithTabs: false,
	tabSize: 4,
	autosave: {
		enabled: true,
		unique_id: "MyUniqueID",
		delay: 1000,
	},
});
```

#### Toolbar icons

Below are the available toolbar icons, which can be reorganized however you like. "Name" is the name of the icon, referenced in the JS. "Action" is either a function or a URL to open. "Class" is the class given to the icon. "Tooltip" is the small tooltip that appears via the `title=""` attribute. The `Ctrl` and `Alt` in the title tags will be changed automatically to their Mac equivalents when needed. Additionally, you can add a separator between any icons by adding `"|"` to the toolbar array.

Name | Action | Class | Tooltip
:--- | :----- | :---- | :------
bold | toggleBold | fa fa-bold | Bold (Ctrl+B)
italic | toggleItalic | fa fa-italic | Italic (Ctrl+I)
code | toggleCodeBlock | fa fa-code | Code (Ctrl+Alt+C)
quote | toggleBlockquote | fa fa-quote-left | Quote (Ctrl+')
unordered-list | toggleUnorderedList | fa fa-list-ul | Generic List (Ctrl+L)
numbered-list | toggleOrderedList | fa fa-list-ol | Numbered List (Ctrl+Alt+L)
link | drawLink | fa fa-link | Create Link (Ctrl+K)
image | drawImage | fa fa-picture-o | Insert Image (Ctrl+Alt+I)
horizontal-rule | drawHorizontalRule | fa fa-minus | Insert Horizontal Line
fullscreen | toggleFullScreen | fa fa-arrows-alt | Toggle Fullscreen (F11)
preview | togglePreview | fa fa-eye | Toggle Preview (Ctrl+P)
guide | [This link](http://nextstepwebs.github.io/simplemde-markdown-editor/markdown-guide) | fa fa-question-circle | Markdown Guide

Customize the toolbar using the `toolbar` option like:

```JavaScript
var simplemde = new SimpleMDE({
	toolbar: [{
			name: "bold",
			action: toggleBold,
			className: "fa fa-bold",
			title: "Bold (Ctrl+B)",
		},
		"|", // Separator
		...
	],
});
```

#### Height

To change the minimum height (before it starts auto-growing):

```CSS
.CodeMirror, .CodeMirror-scroll {
	min-height: 200px;
}
```

Or, you can keep the height static:

```CSS
.CodeMirror {
	height: 300px;
}
```

## Event handling
You can catch the following list of events: https://codemirror.net/doc/manual.html#events

```JavaScript
var simplemde = new SimpleMDE();
simplemde.codemirror.on("change", function(){
	console.log(simplemde.value());
});
```

## How it works
SimpleMDE is an improvement of [lepture's Editor project](https://github.com/lepture/editor) and includes a great many number of changes. It is bundled with [CodeMirror](https://github.com/codemirror/codemirror) and depends on [Font Awesome](http://fortawesome.github.io/Font-Awesome/).

CodeMirror is the backbone of the project and parses much of the markdown syntax as it's being written. This allows us to add styles to the markdown that's being written. Additionally, a toolbar and status bar have been added to the top and bottom, respectively. Previews are rendered by [Marked](https://github.com/chjj/marked).

## What's changed?
As mentioned earlier, SimpleMDE is an improvement of [lepture's Editor project](https://github.com/lepture/editor). So you might be wondering, what's changed? Quite a bit actually. Here's some notable changes:

- Upgraded from CodeMirror 3 to CodeMirror 5
- Many changes to the style, appearance, and user friendliness
- Interface more closely resembles Bootstrap
- Now mobile friendly
- Option to autosave the text as you type
- Now spell checks what you write
- The text editor now automatically grows as you type more
- Fixed a large amount of bugs
- Switched to Font Awesome icons
- Improved preview rendering in many ways
- Improved as-you-type appearance of headers and code blocks
- Simplified the toolbar
- Many new options during instantiation
- New icons and tooltips
- Additional keyboard shortcuts