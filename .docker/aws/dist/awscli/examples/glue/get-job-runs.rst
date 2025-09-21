**To get information about all job runs for a job**

The following ``get-job-runs`` example retrieves information about job runs for a job. ::

    aws glue get-job-runs \
        --job-name "my-testing-job" 

Output::

    {
        "JobRuns": [
            {
                "Id": "jr_012e176506505074d94d761755e5c62538ee1aad6f17d39f527e9140cf0c9a5e",
                "Attempt": 0,
                "JobName": "my-testing-job",
                "StartedOn": 1602873931.255,
                "LastModifiedOn": 1602874075.985,
                "CompletedOn": 1602874075.985,
                "JobRunState": "SUCCEEDED",
                "Arguments": {
                    "--enable-continuous-cloudwatch-log": "true",
                    "--enable-metrics": "",
                    "--enable-spark-ui": "true",
                    "--job-bookmark-option": "job-bookmark-enable",
                    "--spark-event-logs-path": "s3://aws-glue-assets-111122223333-us-east-1/sparkHistoryLogs/"
                },
                "PredecessorRuns": [],
                "AllocatedCapacity": 10,
                "ExecutionTime": 117,
                "Timeout": 2880,
                "MaxCapacity": 10.0,
                "WorkerType": "G.1X",
                "NumberOfWorkers": 10,
                "LogGroupName": "/aws-glue/jobs",
                "GlueVersion": "2.0"
            },
            {
                "Id": "jr_03cc19ddab11c4e244d3f735567de74ff93b0b3ef468a713ffe73e53d1aec08f_attempt_2",
                "Attempt": 2,
                "PreviousRunId": "jr_03cc19ddab11c4e244d3f735567de74ff93b0b3ef468a713ffe73e53d1aec08f_attempt_1",
                "JobName": "my-testing-job",
                "StartedOn": 1602811168.496,
                "LastModifiedOn": 1602811282.39,
                "CompletedOn": 1602811282.39,
                "JobRunState": "FAILED",
                "ErrorMessage": "An error occurred while calling o122.pyWriteDynamicFrame. 
                    Access Denied (Service: Amazon S3; Status Code: 403; Error Code: AccessDenied; 
                    Request ID: 021AAB703DB20A2D; 
                    S3 Extended Request ID: teZk24Y09TkXzBvMPG502L5VJBhe9DJuWA9/TXtuGOqfByajkfL/Tlqt5JBGdEGpigAqzdMDM/U=)",
                "PredecessorRuns": [],
                "AllocatedCapacity": 10,
                "ExecutionTime": 110,
                "Timeout": 2880,
                "MaxCapacity": 10.0,
                "WorkerType": "G.1X",
                "NumberOfWorkers": 10,
                "LogGroupName": "/aws-glue/jobs",
                "GlueVersion": "2.0"
            },
            {
                "Id": "jr_03cc19ddab11c4e244d3f735567de74ff93b0b3ef468a713ffe73e53d1aec08f_attempt_1",
                "Attempt": 1,
                "PreviousRunId": "jr_03cc19ddab11c4e244d3f735567de74ff93b0b3ef468a713ffe73e53d1aec08f",
                "JobName": "my-testing-job",
                "StartedOn": 1602811020.518,
                "LastModifiedOn": 1602811138.364,
                "CompletedOn": 1602811138.364,
                "JobRunState": "FAILED",
                "ErrorMessage": "An error occurred while calling o122.pyWriteDynamicFrame. 
                     Access Denied (Service: Amazon S3; Status Code: 403; Error Code: AccessDenied; 
                     Request ID: 2671D37856AE7ABB; 
                     S3 Extended Request ID: RLJCJw20brV+PpC6GpORahyF2fp9flB5SSb2bTGPnUSPVizLXRl1PN3QZldb+v1o9qRVktNYbW8=)",
                "PredecessorRuns": [],
                "AllocatedCapacity": 10,
                "ExecutionTime": 113,
                "Timeout": 2880,
                "MaxCapacity": 10.0,
                "WorkerType": "G.1X",
                "NumberOfWorkers": 10,
                "LogGroupName": "/aws-glue/jobs",
                "GlueVersion": "2.0"
            }
        ]
    }


For more information, see `Job Runs <https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-jobs-runs.html>`__ in the *AWS Glue Developer Guide*.
