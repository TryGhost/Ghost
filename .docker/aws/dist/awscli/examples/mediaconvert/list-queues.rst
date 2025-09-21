**To list your queues**

The following ``list-queues`` example lists all of your MediaConvert queues. ::

    aws mediaconvert list-queues \
        --endpoint-url https://abcd1234.mediaconvert.us-west-2.amazonaws.com


Output::

    {
        "Queues": [
            {
                "PricingPlan": "ON_DEMAND",
                "Type": "SYSTEM",
                "Status": "ACTIVE",
                "CreatedAt": 1503451595,
                "Name": "Default",
                "SubmittedJobsCount": 0,
                "ProgressingJobsCount": 0,
                "Arn": "arn:aws:mediaconvert:us-west-2:123456789012:queues/Default",
                "LastUpdated": 1534549158
            },
            {
                "PricingPlan": "ON_DEMAND",
                "Type": "CUSTOM",
                "Status": "ACTIVE",
                "CreatedAt": 1537460025,
                "Name": "Customer1",
                "SubmittedJobsCount": 0,
                "Description": "Jobs we run for our cusotmer.",
                "ProgressingJobsCount": 0,
                "Arn": "arn:aws:mediaconvert:us-west-2:123456789012:queues/Customer1",
                "LastUpdated": 1537460025
            },
            {
                "ProgressingJobsCount": 0,
                "Status": "ACTIVE",
                "Name": "transcode-library",
                "SubmittedJobsCount": 0,
                "LastUpdated": 1564066204,
                "ReservationPlan": {
                    "Status": "ACTIVE",
                    "ReservedSlots": 1,
                    "PurchasedAt": 1564066203,
                    "Commitment": "ONE_YEAR",
                    "ExpiresAt": 1595688603,
                    "RenewalType": "EXPIRE"
                },
                "PricingPlan": "RESERVED",
                "Arn": "arn:aws:mediaconvert:us-west-2:123456789012:queues/transcode-library",
                "Type": "CUSTOM",
                "CreatedAt": 1564066204
            }
        ]
    }

For more information, see `Working with AWS Elemental MediaConvert Queues <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-queues.html>`__ in the *AWS Elemental MediaConvert User Guide*.
