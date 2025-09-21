**To set an access point policy**

The following ``put-access-point-policy`` example places the specified access point policy for the access point ``finance-ap`` in account 123456789012. If the access point ``finance-ap`` already has a policy, this command replaces the existing policy with the one specified in this command. Before running this example, replace the account number, access point name, and policy statements with appropriate values for your use case. ::

    aws s3control put-access-point-policy \
        --account-id 123456789012 \
        --name finance-ap \
        --policy file://ap-policy.json

Contents of ``ap-policy.json``::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::123456789012:user/Alice"
                },
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:us-west-2:123456789012:accesspoint/finance-ap/object/Alice/*"
            }
        ]
    }

This command produces no output.

For more information, see `Managing Data Access with Amazon S3 Access Points <https://docs.aws.amazon.com/AmazonS3/latest/dev/access-points.html>`__ in the *Amazon Simple Storage Service Developer Guide*.