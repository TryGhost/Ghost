# Tokens

- Resource-scoped tokens are defined in datafiles.
- Tinybird tracks and updates resource-scoped tokens from datafile contents.

Scopes and usage:
- DATASOURCES:READ:datasource_name => `TOKEN <token_name> READ` in `.datasource` files
- DATASOURCES:APPEND:datasource_name => `TOKEN <token_name> APPEND` in `.datasource` files
- PIPES:READ:pipe_name => `TOKEN <token_name> READ` in `.pipe` files

Examples:
```
TOKEN app_read READ
TOKEN landing_append APPEND
```

For operational tokens (not tied to resources):
```
tb token create static new_admin_token --scope <scope>
```
Scopes: `TOKENS`, `ADMIN`, `ORG_DATASOURCES:READ`, `WORKSPACE:READ_ALL`.

## JWT Tokens

JWT tokens have a TTL and can only use `PIPES:READ` or `DATASOURCES:READ` scopes. They are intended for end users calling endpoints or reading datasources without exposing a master API key.

Create a JWT token:
```
tb token create jwt my_jwt_token --ttl 1h --scope PIPES:READ --resource my_pipe
```

Datasource read with filter:
```
tb token create jwt my_jwt_token --ttl 1h --scope DATASOURCES:READ --resource my_datasource --filter "column = 'value'"
```

Multiple scopes and resources (counts must match), with optional fixed params for PIPES:READ:
```
tb token create jwt my_jwt_token --ttl 1h \
  --scope PIPES:READ --resource my_pipe --fixed-params "k1=v1,k2=v2" \
  --scope DATASOURCES:READ --resource my_datasource --filter "column = 'value'"
```
