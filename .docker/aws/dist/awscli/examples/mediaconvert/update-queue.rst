**To change a queue**

The following ``update-queue`` example pauses the specified queue, by changing its status to ``PAUSED``. ::

    aws mediaconvert update-queue \
    --name Customer1 \
    --status PAUSED
    --endpoint-url https://abcd1234.mediaconvert.us-west-2.amazonaws.com

Output::

    {
        "Queue": {
            "LastUpdated": 1568839845,
            "Status": "PAUSED",
            "ProgressingJobsCount": 0,
            "CreatedAt": 1526428516,
            "Arn": "arn:aws:mediaconvert:us-west-1:123456789012:queues/Customer1",
            "Name": "Customer1",
            "SubmittedJobsCount": 0,
            "PricingPlan": "ON_DEMAND",
            "Type": "CUSTOM"
        }
    }

For more information, see `Working with AWS Elemental MediaConvert Queues <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-queues.html>`__ in the *AWS Elemental MediaConvert User Guide*.
