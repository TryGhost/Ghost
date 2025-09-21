**To describe the log files for a DB instance**

The following ``describe-db-log-files`` example retrieves details about the log files for the specified DB instance. ::

    aws rds describe-db-log-files -\
        -db-instance-identifier test-instance

Output::

    {
        "DescribeDBLogFiles": [
            {
                "Size": 0,
                "LastWritten": 1533060000000,
                "LogFileName": "error/mysql-error-running.log"
            },
            {
                "Size": 2683,
                "LastWritten": 1532994300000,
                "LogFileName": "error/mysql-error-running.log.0"
            },
            {
                "Size": 107,
                "LastWritten": 1533057300000,
                "LogFileName": "error/mysql-error-running.log.18"
            },
            {
                "Size": 13105,
                "LastWritten": 1532991000000,
                "LogFileName": "error/mysql-error-running.log.23"
            },
            {
                "Size": 0,
                "LastWritten": 1533061200000,
                "LogFileName": "error/mysql-error.log"
            },
            {
                "Size": 3519,
                "LastWritten": 1532989252000,
                "LogFileName": "mysqlUpgrade"
            }
        ]
    }
