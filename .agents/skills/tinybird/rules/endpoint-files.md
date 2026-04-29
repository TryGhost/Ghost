# Endpoint Files

Endpoint files are `.pipe` files with `TYPE endpoint` and should live under `/endpoints`.

- Follow all general pipe rules.
- Ensure SQL follows Tinybird SQL rules (templating, SELECT-only, parameters).
- Include the output node in TYPE or in the last node.

Example:

```
DESCRIPTION >
    Some meaningful description of the endpoint

NODE endpoint_node
SQL >
    SELECT ...
TYPE endpoint
```

## Endpoint URLs

- Run `tb endpoint ls` to list all endpoints and their URLs.
- Include dynamic parameters when needed.
- Date formats:
  - DateTime64: `YYYY-MM-DD HH:MM:SS.MMM`
  - DateTime: `YYYY-MM-DD HH:MM:SS`
  - Date: `YYYYMMDD`

## OpenAPI definitions

- curl `<api_base_url>/v0/pipes/openapi.json?token=<token>` to get the OpenAPI definition for all endpoints.
