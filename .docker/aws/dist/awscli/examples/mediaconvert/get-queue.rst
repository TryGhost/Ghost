**To get details for a queue**

The following ``get-queue`` example retrieves the details of the specified custom queue. ::

    aws mediaconvert get-queue \
        --name Customer1 \
        --endpoint-url https://abcd1234.mediaconvert.us-west-2.amazonaws.com

Output::

    {
        "Queue": {
            "LastUpdated": 1526428502,
            "Type": "CUSTOM",
            "SubmittedJobsCount": 0,
            "Status": "ACTIVE",
            "PricingPlan": "ON_DEMAND",
            "CreatedAt": 1526428502,
            "ProgressingJobsCount": 0,
            "Arn": "arn:aws:mediaconvert:us-west-2:123456789012:queues/Customer1",
            "Name": "Customer1"
        }
    }

For more information, see `Working with AWS Elemental MediaConvert Queues <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-queues.html>`__ in the *AWS Elemental MediaConvert User Guide*.
