**To get execution details for a job on a device**

The following ``describe-job-execution`` example gets execution details for the specified job. ::

    aws iot describe-job-execution \
        --job-id "example-job-01" \
        --thing-name "MyRaspberryPi"
        
Output::

    {
        "execution": {
            "jobId": "example-job-01",
            "status": "QUEUED",
            "statusDetails": {},
            "thingArn": "arn:aws:iot:us-west-2:123456789012:thing/MyRaspberryPi",
            "queuedAt": 1560787023.636,
            "lastUpdatedAt": 1560787023.636,
            "executionNumber": 1,
            "versionNumber": 1
        }
    }

For more information, see `Creating and Managing Jobs (CLI) <https://docs.aws.amazon.com/iot/latest/developerguide/manage-job-cli.html>`__ in the *AWS IoT Developer Guide*.
