**To return information about more than one query**

The following ``batch-get-named-query`` example returns information about the named queries that have the specified IDs. ::

    aws athena batch-get-named-query \
        --named-query-ids a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 a1b2c3d4-5678-90ab-cdef-EXAMPLE22222 a1b2c3d4-5678-90ab-cdef-EXAMPLE33333 

Output::

    {
        "NamedQueries": [
            {
                "Name": "Flights Select Query",
                "Description": "Sample query to get the top 10 airports with the most number of departures since 2000",
                "Database": "sampledb",
                "QueryString": "SELECT origin, count(*) AS total_departures\nFROM\nflights_parquet\nWHERE year >= '2000'\nGROUP BY origin\nORDER BY total_departures DESC\nLIMIT 10;",
                "NamedQueryId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "WorkGroup": "primary"
            },
            {
                "Name": "Load flights table partitions",
                "Description": "Sample query to load flights table partitions using MSCK REPAIR TABLE statement",
                "Database": "sampledb",
                "QueryString": "MSCK REPAIR TABLE flights_parquet;",
                "NamedQueryId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "WorkGroup": "primary"
            },
            {
                "Name": "CloudFront Select Query",
                "Description": "Sample query to view requests per operating system during a particular time frame",
                "Database": "sampledb",
                "QueryString": "SELECT os, COUNT(*) count FROM cloudfront_logs WHERE date BETWEEN date '2014-07-05' AND date '2014-08-05' GROUP BY os;",
                "NamedQueryId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "WorkGroup": "primary"
            }
        ],
        "UnprocessedNamedQueryIds": []
    }

For more information, see `Running SQL Queries Using Amazon Athena <https://docs.aws.amazon.com/athena/latest/ug/querying-athena-tables.html>`__ in the *Amazon Athena User Guide*.