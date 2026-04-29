# Mock Data Generation

Tinybird mock data flow (as implemented by the agent) for a datasource:

1) Build a SQL query that returns mock rows.
2) Execute locally with a limit and format using `tb --output=json|csv '<sql>' --rows-limit <rows>` command.
3) Preview the generated output.
4) Confirm creation of a fixture file under `fixtures/`.
5) Write the fixture file:
   - `fixtures/<datasource_name>.ndjson` or `fixtures/<datasource_name>.csv`
6) Confirm append.
7) Append the fixture to the datasource in Tinybird Local.

## Example Mock Query

```
SELECT
    rand() % 1000 AS experience_gained,
    1 + rand() % 100 AS level,
    rand() % 500 AS monster_kills,
    concat('player_', toString(rand() % 10000)) AS player_id,
    rand() % 50 AS pvp_kills,
    rand() % 200 AS quest_completions,
    now() - rand() % 86400 AS timestamp
FROM numbers(ROWS)
```

Notes:
- The query must return exactly `ROWS` rows via `FROM numbers(ROWS)`.
- Do not add FORMAT or a trailing semicolon in the mock query itself.

## Error Handling Notes

- If the datasource is in quarantine, query `<datasource_name>_quarantine` and surface the first 5 rows.
- If append fails with "must be created first with 'mode=create'", rebuild the project and retry.
