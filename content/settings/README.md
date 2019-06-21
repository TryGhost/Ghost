# Content / Settings

### routes.yaml

To find out more about `routes.yaml` configuration and how to use it visit [documentation](https://docs.ghost.org/api/handlebars-themes/routing/#base-configuration).

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
```
