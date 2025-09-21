**To cancel a job**

The following ``cancel-job`` example cancels the specified job. ::

    aws iot cancel-job \
        --job-job "example-job-03"
        
Output::

    {
        "jobArn": "arn:aws:iot:us-west-2:123456789012:job/example-job-03",
        "jobId": "example-job-03",
        "description": "example job test"
    }

For more information, see `Creating and Managing Jobs (CLI) <https://docs.aws.amazon.com/iot/latest/developerguide/manage-job-cli.html>`__ in the *AWS IoT Developer Guide*.
