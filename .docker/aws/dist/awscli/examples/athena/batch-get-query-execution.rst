**To return information about one or more query executions**

The following ``batch-get-query-execution`` example returns query execution information for the queries that have the specified query IDs. ::

    aws athena batch-get-query-execution \
        --query-execution-ids a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 a1b2c3d4-5678-90ab-cdef-EXAMPLE22222

Output::

    {
        "QueryExecutions": [
            {
                "QueryExecutionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "Query": "create database if not exists webdata",
                "StatementType": "DDL",
                "ResultConfiguration": {
                    "OutputLocation": "s3://amzn-s3-demo-bucket/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111.txt"
                },
                "QueryExecutionContext": {},
                "Status": {
                    "State": "SUCCEEDED",
                    "SubmissionDateTime": 1593470720.592,
                    "CompletionDateTime": 1593470720.902
                },
                "Statistics": {
                    "EngineExecutionTimeInMillis": 232,
                    "DataScannedInBytes": 0,
                    "TotalExecutionTimeInMillis": 310,
                "ResultConfiguration": {
    
                    "QueryQueueTimeInMillis": 50,
                    "ServiceProcessingTimeInMillis": 28
                },
                "WorkGroup": "AthenaAdmin"
            },
            {
                "QueryExecutionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "Query": "select date, location, browser, uri, status from cloudfront_logs where method = 'GET' and status = 200 and location like 'SFO%' limit 10",
                "StatementType": "DML",
                "ResultConfiguration": {
                    "OutputLocation": "s3://amzn-s3-demo-bucket/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222.csv"
                },
                "QueryExecutionContext": {
                    "Database": "mydatabase",
                    "Catalog": "awsdatacatalog"
                },
                "Status": {
                    "State": "SUCCEEDED",
                    "SubmissionDateTime": 1593469842.665,
                    "CompletionDateTime": 1593469846.486
                },
                "Statistics": {
                    "EngineExecutionTimeInMillis": 3600,
                    "DataScannedInBytes": 203089,
                    "TotalExecutionTimeInMillis": 3821,
                    "QueryQueueTimeInMillis": 267,
                    "QueryPlanningTimeInMillis": 1175
                },
                "WorkGroup": "AthenaAdmin"
            }
        ],
        "UnprocessedQueryExecutionIds": []
    }

For more information, see `Running SQL Queries Using Amazon Athena <https://docs.aws.amazon.com/athena/latest/ug/querying-athena-tables.html>`__ in the *Amazon Athena User Guide*.
