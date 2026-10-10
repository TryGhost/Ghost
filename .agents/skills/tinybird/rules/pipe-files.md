# Pipe Files (General)

- Pipe names must be unique.
- Node names must differ from the pipe name and any resource name.
- No indentation for property names (DESCRIPTION, NODE, SQL, TYPE, etc.).
- Allowed TYPE values: endpoint, copy, materialized, sink.
- Add the output node in the TYPE section or in the last node.

Example:

```
DESCRIPTION >
    Some meaningful description of the pipe

NODE node_1
SQL >
    SELECT ...
TYPE endpoint
```
