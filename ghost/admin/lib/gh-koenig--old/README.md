# gh-koenig

This is the new mobiledoc editor for Ghost-Admin. It's still a work in progress but we're very excited about it.

Here are a few of our goals:

- To make the best ghosh darn writing experience on the interwebs.
- To build a tool that works just as well for non technical content creators as power users.
- To support rich content as easily as dealing with an image. Want a poll mid article? You got it. Want to paste a complete NG application in raw HTML? You got it.

When embarking on this project the last thing we wanted was to use one of those WYSIWYG editors with the million options and incomprehensible and inconsistent markup (you know who I'm talking about), to that end we chose to build our editor on top of [mobiledoc-kit](https://github.com/bustlelabs/mobiledoc-kit), you can read more about our decision [here](https://github.com/TryGhost/Ghost/issues/7429).

## So why mobiledoc? 
Mobiledoc is a new format for storing rich content, it's platform independent and isn't tied specifically to HTML (we can render a plain text version for a search index for instance). It allows for the embedding of rich applications inside your content using the cards paradigm. It's also a standard so content written in and for Ghost is compatible with any other mobiledoc system, and vice versa.
 
To us it seemed like the best compromise between a feature rich WYSIWYG editor and the markdown that we so love.
 
Like Ghost, Mobiledoc-kit is still moving towards its 1.0 release - it still has some bugs, but we're working together to make something really fun. 

## To try it out:

- clone this repo
- `cd gh-koenig`
- `npm install && bower install`
- `ember serve`
- Visit `http://localhost:4200`
- Click in the middle to activate the editor

## If you want to help out:

- Create an issue on the main Ghost repository [https://github.com/TryGhost/Ghost/issues](https://github.com/TryGhost/Ghost/issues).
- Clone the repo and create a branch.
- Submit a PR.

A fantastic guide on the Ghost workflow is here: https://github.com/TryGhost/Ghost/wiki/Git-workflow, it's well worth a read.

## Some features of the editor.

gh-koenig is very much a WYSIWYG editor but it supports a subset of markdown as content shortcuts for those of us who are mouse adverse, specifically:

```text
# H1
## H2
### H3
1. Ordered Lists
* Unordered Lists
- Unordered Lists
> Block Quote
*italic*
_italic_
**bold**
__bold__
~~strikethrough~~
[link](http://www.ghost.org)
![image](https://ghost.org/assets/logos-f93942864f8c9f4a0a9b0ecd6f7f055c.png)
``` code blocks (generates a new markdown card) ```
```
There's also an inline menu that you can access by pressing the **/** key within the editor.

Right now we only have three built in "cards", a markdown card, an HTML card, and an Image card. But we plan to add the ability to install custom cards in the near future and have some big and exciting plans (and we're even more excited about what the community will do with it.), so watch this space.

# Copyright & License

Copyright (c) 2016-2018 Ghost Foundation - Released under the [MIT license](LICENSE).

