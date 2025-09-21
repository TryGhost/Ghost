**To retrieve query statistics**

The following ``get-query-statistics`` example retrieves statistics on the planning and execution of a query. ::

    aws lakeformation get-query-statistics \
        --query-id='1234273f-4a62-4cda-8d98-69615ee8be9b' 

Output::

    {
        "ExecutionStatistics": {
            "AverageExecutionTimeMillis": 0,
            "DataScannedBytes": 0,
            "WorkUnitsExecutedCount": 0
        },
        "PlanningStatistics": {
            "EstimatedDataToScanBytes": 43235,
            "PlanningTimeMillis": 2377,
            "QueueTimeMillis": 440,
            "WorkUnitsGeneratedCount": 1
        },
        "QuerySubmissionTime": "2022-08-11T02:14:38.641870+00:00"
    }

For more information, see `Transactional data operations <https://docs.aws.amazon.com/lake-formation/latest/dg/transactions-data-operations.html>`__ in the *AWS Lake Formation Developer Guide*.
