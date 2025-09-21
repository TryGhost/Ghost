**To retrieve access point configuration details**

The following ``get-access-point`` example retrieves the configuration details for the access point named ``finance-ap`` in account 123456789012. Before running this example, replace the access point name and account number with appropriate values for your use case. ::

    aws s3control get-access-point \
        --account-id 123456789012 \
        --name finance-ap

Output::

    {
        "Name": "finance-ap",
        "Bucket": "business-records",
        "NetworkOrigin": "Internet",
        "PublicAccessBlockConfiguration": {
            "BlockPublicAcls": false,
            "IgnorePublicAcls": false,
            "BlockPublicPolicy": false,
            "RestrictPublicBuckets": false
        },
        "CreationDate": "2020-01-01T00:00:00Z"
    }

For more information, see `Managing Data Access with Amazon S3 Access Points <https://docs.aws.amazon.com/AmazonS3/latest/dev/access-points.html>`__ in the *Amazon Simple Storage Service Developer Guide*.
