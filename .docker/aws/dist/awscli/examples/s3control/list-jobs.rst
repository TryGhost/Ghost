**To list an accounts Amazon S3 batch operations jobs**

The following ``list-jobs`` example lists all recent batch operations jobs for the specified account. ::

    aws s3control list-jobs \
        --account-id 123456789012

Output::

    {
        "Jobs": [
            {
                "Operation": "S3PutObjectTagging",
                "ProgressSummary": {
                    "NumberOfTasksFailed": 0,
                    "NumberOfTasksSucceeded": 8,
                    "TotalNumberOfTasks": 8
                },
                "CreationTime": "2019-10-03T21:48:48.048Z",
                "Status": "Complete",
                "JobId": "93735294-df46-44d5-8638-6356f335324e",
                "Priority": 42
            },
            {
                "Operation": "S3PutObjectTagging",
                "ProgressSummary": {
                    "NumberOfTasksFailed": 0,
                    "NumberOfTasksSucceeded": 0,
                    "TotalNumberOfTasks": 0
                },
                "CreationTime": "2019-10-03T21:46:07.084Z",
                "Status": "Failed",
                "JobId": "3f3c7619-02d3-4779-97f6-1d98dd313108",
                "Priority": 42
            },
        ]
    }
