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

## Testing Endpoints

Use `tb endpoint data` to test endpoint output:

```
tb endpoint data my_endpoint
tb endpoint data my_endpoint --start_date 2024-01-01 --end_date 2024-01-31
```

Use `tb endpoint data`, not `tb pipe data`. The `endpoint data` command calls the endpoint as a consumer would, including parameter validation and output formatting.

## Endpoint URLs

- Run `tb endpoint ls` to list all endpoints and their URLs.
- Include dynamic parameters when needed.
- Date formats:
  - DateTime64: `YYYY-MM-DD HH:MM:SS.MMM`
  - DateTime: `YYYY-MM-DD HH:MM:SS`
  - Date: `YYYYMMDD`

## OpenAPI Definitions

- curl `<api_base_url>/v0/pipes/openapi.json?token=<token>` to get the OpenAPI definition for all endpoints.
