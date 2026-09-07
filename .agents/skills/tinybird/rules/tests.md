# Tests

- Test file name must match the pipe name.
- Scenario names must be unique inside a test file.
- Parameters format: `param1=value1&param2=value2`.
- Preserve case and formatting when user provides parameters.
- If no parameters, create a single test with empty parameters.
- Use fixture data for expected results; do not query endpoints or SQL to infer data.
- Before creating tests, analyze fixture files used by the endpoint tables.
- `expected_result` should always be an empty string; the tool fills it.
- Only create tests when explicitly requested (e.g. "Create tests for this endpoint").
- If asked to "test" or "call" an endpoint, use `tb endpoint data` instead of creating tests.

Test format:

```
- name: kpis_single_day
  description: Test hourly granularity for a single day
  parameters: date_from=2024-01-01&date_to=2024-01-01
  expected_result: ''
```

## Fixture Data

Fixtures live under `/fixtures` and provide sample data for testing.

- Name fixture files to match the Data Source they populate: `fixtures/<datasource_name>.ndjson` or `.csv`.
- Load fixtures into a local or branch environment with `tb datasource append <name> --file fixtures/<name>.ndjson`.
- Design fixture data to cover the scenarios your tests need (edge cases, date ranges, different parameter values).
- Keep fixtures small and deterministic. They should be committed to version control.

## Running Tests

```
tb test run                      # Run all tests
tb test run tests/my_endpoint    # Run specific test file
tb test update tests/my_endpoint # Update expected results from current output
```
