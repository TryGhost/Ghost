# Modifying Email Templates

## Things to keep in mind

Before you start, here are some limitations you should be aware of:

> When it comes to email HTML, note that all best practices from web development goes out the window. To make the look consistent, you should:
> - Use table based layouts
> - Use the old-school attribute styling for tables
> - Use ONLY inline-styles, and only very simple such. ```<style>```-tags are discarded by many clients.
> - Skip using ```<html>```, ```<head>``` and ```<body>``` - They will be discarded by most clients anyway.
> - If you embed images, try to make sure that the e-mail looks decent even if images are not loaded. Many - clients require the user to mark the email as "safe" before displaying images.

[[src](http://stackoverflow.com/a/2935522/1021300)]


## Editing existing email templates

All email templates are located in ```/your/path/to/Ghost/core/server/email-templates```.  
Inside the folder called "raw" are the easy-to-maintain version of our emails. These are the files that you should be editing to maintain your sanity, since the styles are in a ```<style>```-tag and not inline.  
The files that are not inside the "raw" directory should never be touched manually, since these are the ones that were generated to have in-line styles.  

## Data binding

When editing the "raw" email templates, you will notice there are things wrapped in ```{{``` and  ```}}``` brackets. These will be replaced at run-time with the proper data (under the hood, we are using [lo-dash's micro-templating engine](http://lodash.com/docs#template)). So please make sure to not tamper with these unless you really need to.

## In-lining your CSS

Once you are done making the changes you want, here is how to generate the in-lined CSS version of your newly updated file:
- Install [juice2](https://www.npmjs.org/package/juice2) - ```npm install -g juice2 ```
  - There are a few other alternatives, but this is the recommended tool (or [Inline Styler](http://inlinestyler.torchboxapps.com/) if you're more of the copy/paste type)
  - If you are a Windows user and want to use juice, you will want to take a look at this: https://github.com/tmpvar/jsdom
- In your terminal, change directories to ```/path/to/Ghost/core/server/email-templates```
- To generate in in-lined CSS version, run ```juice2 raw/input.html output.html```
  - where ```raw/input.html``` is the file you originally edited and ```out.html``` is the file you want to generate
- Now commit both files (the edited and the generated ones) and celebrate


## Misc

For a history of this discussion, please reference this issue: https://github.com/TryGhost/Ghost/issues/3082
