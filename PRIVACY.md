# Privacy

This is a plain English summary of all of the components within Ghost which may affect your privacy in some way. Please keep in mind that if you use third party Themes or Apps with Ghost, there may be additional things not listed here.

Each of the items listed in this document can be disabled via Ghost's `config.[env].json` file. Check out the [configuration guide](https://docs.ghost.org/docs/config#section-privacy) for details.

## Official Services

Some official services for Ghost are enabled by default. These services connect to Ghost.org and are managed by the Ghost Foundation: the Non-Profit organisation which runs the Ghost project.


### Automatic Update Checks

When a new session is started, Ghost pings a Ghost.org endpoint to check if the current version of Ghost is the latest version of Ghost. If an update is available, a notification appears inside Ghost to let you know. Ghost.org collects basic anonymised usage statistics from update check requests.

This service can be disabled at any time. All of the information and code related to this service is available in the [update-check.js](https://github.com/TryGhost/Ghost/blob/master/core/server/update-check.js) file.


## Third Party Services

Ghost uses a number of third party services for specific functionality within Ghost.

### Gravatar

To automatically populate your profile picture, Ghost pings [Gravatar](http://gravatar.com) to see if your email address is associated with a profile there. If it is, we pull in your profile picture. If not: nothing happens.

### RPC Pings

When you publish a new post, Ghost sends out an RPC ping to let third party services know that new content is available on your blog. This enables search engines and other services to discover and index content on your blog more quickly. At present Ghost sends an RPC ping to the following services when you publish a new post:

- http://blogsearch.google.com
- http://rpc.pingomatic.com

RPC pings only happen when Ghost is running in the `production` environment.

### Structured Data

Ghost outputs basic meta tags to allow rich snippets of your content to be recognised by popular social networks. Currently there are 3 supported rich data protocols which are output in `{{ghost_head}}`:

- Schema.org - http://schema.org/docs/documents.html
- Open Graph - http://ogp.me/
- Twitter cards - https://dev.twitter.com/cards/overview

### Default Theme

The default theme which comes with Ghost loads a copy of jQuery from the jQuery Foundation's [public CDN](https://code.jquery.com/jquery-1.11.3.min.js), and makes use of the Open Sans [Google Font](https://www.google.com/fonts). The theme also contains three sharing buttons to [Twitter](http://twitter.com), [Facebook](http://facebook.com), and [Google Plus](http://plus.google.com). No resources are loaded from any services, however the buttons do allow visitors to your blog to share your content publicly on these respective networks.
