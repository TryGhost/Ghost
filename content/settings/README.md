# Content / Settings

### routes.yaml

To find out more about `routes.yaml` configuration and how to use it visit [documentation](https://ghost.org/docs/themes/routing/).

This is how the default `routes.yaml` file looks like:

```yaml
routes:

collections:
  /:
    permalink: '/{slug}/'
    template:
      - index

taxonomies:
  tag: /tag/{slug}/
  author: /author/{slug}/


### headers.yaml

The headers file provides the user the ability to customize headers.

/*:
  Referrer-Policy: no-referrer-when-downgrade
  Strict-Transport-Security: 'max-age=31536000; includeSubDomains; preload'
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Content-Security-Policy: default-src 'self' ### Whitelisting everything in project
  Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=() ### Transform Feature-Policy to Permissions-Policy
