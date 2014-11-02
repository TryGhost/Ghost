# Uploadcare/Ghost Integration

Forked: https://github.com/TryGhost/Ghost

This is **temporary repository** for integrating Uploadcare with
Ghost bloggin platform.

## Getting Started

1. Clone the GitHub repository;
1. Install Grunt and build assets:
  * `npm install -g grunt-cli`
  * `npm install`
  * `grunt init` (and `grunt prod` if you want to run Ghost in production mode)
  * `npm start`
1. Navigate to `http://localhost:2368/ghost/` and sign up;
1. Go to post editing.

## Goal

See `ghost-uploadcare.js`. This is a draft, and needs to be converted to a proper Bower package.

### How it supposed to work

User opens a blog post for editing, and clicks on the plugin button (in this screenshot it's in the top menu):

![Edit Post](http://www.ucarecdn.com/435bb206-d828-4abd-8838-22176cc2e487/-/resize/600x/)

Uploadcare widget loads, and user can upload an image from any source:

![Upload an Image](http://www.ucarecdn.com/feb42262-5766-415c-a005-17b416cbe71b/-/resize/600x/)

Image can be cropped:

![Crop image](http://www.ucarecdn.com/04583716-cb85-40c6-8604-f30f3caddba4/-/resize/600x/)

And the link to uploaded and cropped image is pasted to the current cursor position,
so it appears in the text:

![Image appears in the text](http://www.ucarecdn.com/e462efbc-59a4-4422-9b20-5e240a9762f2/-/resize/600x/)


## More info

* Uploadcare: https://uploadcare.com
* Ghost: http://ghost.org

## Copyright & License

Copyright (c) 2013-2014 Ghost Foundation - Released under the [MIT license](LICENSE).
Copyright (c) 2014 Uploadcare LLC.
