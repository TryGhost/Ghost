**To list the jobs in your AWS account**

The following ``list-job-executions-for-job`` example lists all job executions for a job in your AWS account, specified by the jobId. ::

    aws iot list-job-executions-for-job \
        --job-id my-ota-job

Output::

   {
        "executionSummaries": [
            {
                "thingArn": "arn:aws:iot:us-east-1:123456789012:thing/my_thing",
                "jobExecutionSummary": {
                    "status": "QUEUED",
                    "queuedAt": "2022-03-07T15:58:42.195000-08:00",
                    "lastUpdatedAt": "2022-03-07T15:58:42.195000-08:00",
                    "executionNumber": 1,
                    "retryAttempt": 0
                }
            }
        ]
    }

For more information, see `Creating and Managing Jobs (CLI) <https://docs.aws.amazon.com/iot/latest/developerguide/manage-job-cli.html>`__ in the *AWS IoT Developer Guide*.