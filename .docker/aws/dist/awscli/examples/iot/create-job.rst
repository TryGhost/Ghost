**Example 1: To create a job**

The following ``create-job`` example creates a simple AWS IoT job that sends a JSON document to the ``MyRaspberryPi`` device. ::

    aws iot create-job \
        --job-id "example-job-01" \
        --targets "arn:aws:iot:us-west-2:123456789012:thing/MyRaspberryPi" \
        --document file://example-job.json \
        --description "example job test" \
        --target-selection SNAPSHOT

Output::

    {
        "jobArn": "arn:aws:iot:us-west-2:123456789012:job/example-job-01",
        "jobId": "example-job-01",
        "description": "example job test"
    }

**Example 2: To create a continuous job**

The following ``create-job`` example creates a job that continues to run after the things specified as targets have completed the job. In this example, the target is a thing group, so when new devices are added to the group, the continuous job runs on those new things.

    aws iot create-job \
        --job-id "example-job-04" \
        --targets "arn:aws:iot:us-west-2:123456789012:thinggroup/DeadBulbs" \
        --document file://example-job.json --description "example continuous job" \
        --target-selection CONTINUOUS

Output::

    {
        "jobArn": "arn:aws:iot:us-west-2:123456789012:job/example-job-04",
        "jobId": "example-job-04",
        "description": "example continuous job"
    }

For more information, see `Creating and Managing Jobs (CLI) <https://docs.aws.amazon.com/iot/latest/developerguide/manage-job-cli.html>`__ in the *AWS IoT Developer Guide*.
