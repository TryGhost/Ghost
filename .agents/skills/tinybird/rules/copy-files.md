# Copy Pipe Files

- Do not create by default unless requested.
- Create under `/copies`.
- Do not include COPY_SCHEDULE unless explicitly requested.
- Use TYPE COPY and TARGET_DATASOURCE.
- The default `copy_mode` is `append`; but it's better if you set it explicitly. The other option is `replace`

Example:

```
DESCRIPTION Copy Pipe to export sales hour every hour to the sales_hour_copy Data Source

NODE daily_sales
SQL >
    %
    SELECT toStartOfDay(starting_date) day, country, sum(sales) as total_sales
    FROM teams
    WHERE day BETWEEN toStartOfDay(now()) - interval 1 day AND toStartOfDay(now())
    and country = {{ String(country, 'US')}}
    GROUP BY day, country

TYPE COPY
TARGET_DATASOURCE sales_hour_copy
COPY_SCHEDULE 0 * * * *
COPY_MODE append
```
