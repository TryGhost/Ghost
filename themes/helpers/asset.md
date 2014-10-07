---
layout: themes
meta_title: Theme helper reference - Ghost Docs
meta_description: Ghost theme helper API, helper reference documentation
chapter: themes
section: helpers
permalink: /themes/helpers/asset/
canonical: http://themes.ghost.org/v5.2/docs/asset
redirectToCanonical: true
---

{% raw %}

# asset

 * Type: Output
 * Parameters: asset path (string)
 * Attributes: none

<!--
 * Origin: Ghost
 * Required: Yes
 * Context: All
-->


### Description

The `{{asset}}` helper exists to take the pain out of asset management. Firstly, it ensures that the relative path to an asset is always correct, regardless of how Ghost is installed. So if Ghost is installed in a subdirectory, the paths to the files are still correct, without having to use absolute URLs.

Secondly, it allows assets to be cached. All assets are served with a `?v=#######` query string which currently changes when Ghost is restarted and ensures that assets can be cache busted when necessary.

Thirdly, it provides stability for theme developers so that as Ghost's asset handling and management evolves and matures, theme developers should not need to make further adjustments to their themes as long as they are using the asset helper.

Finally, it imposes a little bit of structure on themes by requiring an <code class="path">assets</code> folder, meaning that Ghost knows where the assets are, and theme installing, switching live reloading will be easier in future.

### Usage

To use the `{{asset}}` helper to output the path for an asset, simply provide it with the path for the asset you want to load, relative to the <code class="path">assets</code> folder.

```
// will output something like: <link rel="stylesheet" type="text/css" href="/path/to/blog/assets/css/style.css?v=1234567" />
<link rel="stylesheet" type="text/css" href="{{asset "css/style.css"}}" />
```

```
// will output something like: <script type="text/javascript" src="/path/to/blog/assets/js/index.js?v=1234567"></script>
<script type="text/javascript" src="{{asset "js/index.js"}}"></script>
```

### Favicons

Favicons are a slight exception to the rule on how to use the asset helper, because the browser always requests one regardless of whether it is defined in the theme, and Ghost aims to serve this request as fast as possible.

By default `{{asset "favicon.ico"}}` works exactly the same as the browser's default request, serving Ghost's default favicon from the shared folder.
This means it doesn't have to look up what theme the blog is using or where that theme lives before serving the request.

If you would like to use a custom favicon, you can do so by putting a <code class="path">favicon.ico</code> in your theme's <code class="path">assets</code> folder and using the asset helper with a leading slash:

`{{asset "/favicon.ico"}}`

This trailing slash tells Ghost not to serve the default favicon, but to serve it from the themes <code class="path">assets</code> folder.

{% endraw %}