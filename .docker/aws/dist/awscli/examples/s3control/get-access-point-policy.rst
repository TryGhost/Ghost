**To retrieve an access point policy**

The following ``get-access-point-policy`` example retrieves the access point policy from the access point named ``finance-ap`` in account 123456789012. Before running this example, replace the access point name and account number with appropriate values for your use case. ::

    aws s3control get-access-point-policy \
        --account-id 123456789012 \
        --name finance-ap

Output::

    {
        "Policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"arn:aws:iam::123456789012:role/Admin\"},\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:us-west-2:123456789012:accesspoint/finance-ap/object/records/*\"}]}"
    }

For more information, see `Managing Data Access with Amazon S3 Access Points <https://docs.aws.amazon.com/AmazonS3/latest/dev/access-points.html>`__ in the *Amazon Simple Storage Service Developer Guide*.
