**To return a named query**

The following ``get-named-query`` example returns information about the query that has the specified ID. ::

    aws athena get-named-query \
        --named-query-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "NamedQuery": {
            "Name": "CloudFront Logs - SFO",
            "Description": "Shows successful GET request data for SFO",
            "Database": "default",
            "QueryString": "select date, location, browser, uri, status from cloudfront_logs where method = 'GET' and status = 200 and location like 'SFO%' limit 10",
            "NamedQueryId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "WorkGroup": "AthenaAdmin"
        }
    }

For more information, see `Running SQL Queries Using Amazon Athena <https://docs.aws.amazon.com/athena/latest/ug/querying-athena-tables.html>`__ in the *Amazon Athena User Guide*.