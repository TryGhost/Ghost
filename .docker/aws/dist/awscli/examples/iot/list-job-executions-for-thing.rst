**To list the jobs that were executed for a thing**

The following ``list-job-executions-for-thing`` example lists all jobs that were executed for the thing named ``MyRaspberryPi``. ::

    aws iot list-job-executions-for-thing \
        --thing-name "MyRaspberryPi"
        
Output::

    {
        "executionSummaries": [
            {
                "jobId": "example-job-01",
                "jobExecutionSummary": {
                    "status": "QUEUED",
                    "queuedAt": 1560787023.636,
                    "lastUpdatedAt": 1560787023.636,
                    "executionNumber": 1
                }
            }
        ]
    }

For more information, see `Creating and Managing Jobs (CLI) <https://docs.aws.amazon.com/iot/latest/developerguide/manage-job-cli.html>`__ in the *AWS IoT Developer Guide*.
