# Privacy

This is a plain English summary of all of the components within Ghost which may affect your privacy in some way. Please keep in mind that if you use third party Themes or Apps with Ghost, there may be additional things not listed here.

Each of the items listed in this document can be disabled via Ghost's `config.[env].json` file. Check out the [configuration guide](https://ghost.org/docs/config/#privacy) for details.

## Official Services

Some official services for Ghost are enabled by default. These services connect to Ghost.org and are managed by the Ghost Foundation: the Non-Profit organisation which runs the Ghost project.


### Automatic Update Checks

When a new session is started, Ghost pings a Ghost.org service to check if the current version of Ghost is the latest version of Ghost. If an update is available, a notification on the About Page appears to let you know.

Ghost will collect basic anonymised usage statistics from your blog before sending the request to the service. You can disable collecting statistics using the [privacy configuration](https://ghost.org/docs/config/). You will still receive notifications from the service.

All of the information and code related to this service is available in the [update-check.js](https://github.com/TryGhost/Ghost/blob/master/core/server/update-check.js) file.


## Third Party Services

Ghost uses a number of third party services for specific functionality within Ghost.

### JSDELIVR

To easily load functionality for membership features & search, Ghost leverages [JSDELIVR](https://www.jsdelivr.com/) to provide a CDN for drop-in scripts. 

### Gravatar

To automatically populate your profile picture, Ghost pings [Gravatar](http://gravatar.com) to see if your email address is associated with a profile there. If it is, we pull in your profile picture. If not: nothing happens.

### RPC Pings

When you publish a new post, Ghost sends out an RPC ping to let third party services know that new content is available on your blog. This enables search engines and other services to discover and index content on your blog more quickly. At present Ghost sends an RPC ping to the following service when you publish a new post:

- http://rpc.pingomatic.com

RPC pings only happen when Ghost is running in the `production` environment.

### Structured Data

Ghost outputs basic meta tags to allow rich snippets of your content to be recognised by popular social networks. Currently there are 3 supported rich data protocols which are output in `{{ghost_head}}`:

- Schema.org - http://schema.org/docs/documents.html
- Open Graph - http://ogp.me/
- Twitter cards - https://dev.twitter.com/cards/overview