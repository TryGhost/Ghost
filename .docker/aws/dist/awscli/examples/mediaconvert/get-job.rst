**To get details for a particular job**

The following example requests the information for the job with ID ``1234567890987-1ab2c3``, which in this example ended in an error. ::

    aws mediaconvert get-job \
        --endpoint-url https://abcd1234.mediaconvert.region-name-1.amazonaws.com \
        --region region-name-1 \
        --id 1234567890987-1ab2c3

To get your account-specific endpoint, use ``describe-endpoints``, or send the command without the endpoint. The service returns an error and your endpoint.

If your request is successful, the service returns a JSON file with job information, including job settings, any returned errors, and other job data, as follows::

    {
        "Job": {
            "Status": "ERROR",
            "Queue": "arn:aws:mediaconvert:region-name-1:012345678998:queues/Queue1",
            "Settings": {
                ...<truncated for brevity>...
            },
            "ErrorMessage": "Unable to open input file [s3://my-input-bucket/file-name.mp4]: [Failed probe/open: [Failed to read data: AssumeRole failed]]",
            "ErrorCode": 1434,
            "Role": "arn:aws:iam::012345678998:role/MediaConvertServiceRole",
            "Arn": "arn:aws:mediaconvert:us-west-1:012345678998:jobs/1234567890987-1ab2c3",
            "UserMetadata": {},
            "Timing": {
                "FinishTime": 1517442131,
                "SubmitTime": 1517442103,
                "StartTime": 1517442104
            },
            "Id": "1234567890987-1ab2c3",
            "CreatedAt": 1517442103
        }
    }

For more information, see `Working with AWS Elemental MediaConvert Jobs <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-jobs.html>`_ in the *AWS Elemental MediaConvert User Guide*.
