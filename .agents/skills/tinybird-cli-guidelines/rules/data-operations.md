# Data Operations (Replace & Delete)

Operations for updating and removing data from Data Sources.

## Delete Data Selectively

Delete rows matching a SQL condition:

```bash
tb datasource delete events --sql-condition "toDate(date) >= '2019-11-01' AND toDate(date) <= '2019-11-30'"
```

- Runs asynchronously (returns job ID); use `--wait` to block until complete
- **Does not cascade** to downstream Materialized Views—delete from MVs separately
- Requires ADMIN token scope
- Safe to run while actively ingesting data

## Truncate Data Source

Delete all rows from a Data Source:

```bash
tb datasource truncate events
```

Use `--cascade` to also truncate dependent Data Sources attached via Materialized Views.

## Replace Data Selectively (Partial Replace)

Replace only data matching a condition:

```bash
tb datasource replace events data.csv --sql-condition "toDate(date) >= '2019-11-01' AND toDate(date) <= '2019-11-30'"
```

**⚠️ Critical**: Never replace data in partitions where you are actively ingesting. You may lose data inserted during the operation.

**Rules**:
- **Always include the partition key** in the SQL condition
- The condition determines: (1) which partitions to operate on, (2) which rows from new data to append
- **Cascades automatically** to downstream Materialized Views (all must have compatible partition keys)
- Schema of new data must match existing Data Source exactly

### Why Partition Key Matters

If your Data Source uses `ENGINE_PARTITION_KEY "country"` and you run:
```bash
tb datasource replace events data.csv --sql-condition "status='active'"
```
This will **not work as expected**—the replace process uses payload rows to identify partitions. Always match the partition key.

## Replace Data Completely (Full Replace)

Replace entire Data Source contents (no `--sql-condition`):

```bash
tb datasource replace events data.csv
```

**⚠️ Critical**: Do not run while actively ingesting—you may lose data.
