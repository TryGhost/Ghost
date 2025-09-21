**To get details for all jobs in a region**

The following example requests the information for all of your jobs in the specified region. ::

    aws mediaconvert list-jobs \
        --endpoint-url https://abcd1234.mediaconvert.region-name-1.amazonaws.com \
        --region region-name-1

To get your account-specific endpoint, use ``describe-endpoints``, or send the command without the endpoint. The service returns an error and your endpoint.

For more information, see `Working with AWS Elemental MediaConvert Jobs <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-jobs.html>`_ in the *AWS Elemental MediaConvert User Guide*.
