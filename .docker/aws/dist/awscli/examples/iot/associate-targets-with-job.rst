**To associate a thing group with a continuous job**

The following ``associate-targets-with-job`` example associates the specified thing group with the specified continuous job. ::

    aws iot associate-targets-with-job \
        --targets "arn:aws:iot:us-west-2:123456789012:thinggroup/LightBulbs" \
        --job-id "example-job-04"

Output::

    {
        "jobArn": "arn:aws:iot:us-west-2:123456789012:job/example-job-04",
        "jobId": "example-job-04",
        "description": "example continuous job"
    }

For more information, see `Creating and Managing Jobs (CLI) <https://docs.aws.amazon.com/iot/latest/developerguide/manage-job-cli.html>`__ in the *AWS IoT Developer Guide*.
