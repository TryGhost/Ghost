**To create a Verified Access group**

The following ``create-verified-access-group`` example creates a Verified Access group for the specified Verified Access instance. ::

    aws ec2 create-verified-access-group \
        --verified-access-instance-id vai-0ce000c0b7643abea \
        --tag-specifications ResourceType=verified-access-group,Tags=[{Key=Name,Value=my-va-group}]


Output::

    {
        "VerifiedAccessGroup": {
            "VerifiedAccessGroupId": "vagr-0dbe967baf14b7235",
            "VerifiedAccessInstanceId": "vai-0ce000c0b7643abea",
            "Description": "",
            "Owner": "123456789012",
            "VerifiedAccessGroupArn": "arn:aws:ec2:us-east-2:123456789012:verified-access-group/vagr-0dbe967baf14b7235",
            "CreationTime": "2023-08-25T19:55:19",
            "LastUpdatedTime": "2023-08-25T19:55:19",
            "Tags": [
                {
                    "Key": "Name",
                    "Value": "my-va-group"
                }
            ]
        }
    }

For more information, see `Verified Access groups <https://docs.aws.amazon.com/verified-access/latest/ug/verified-access-groups.html>`__ in the *AWS Verified Access User Guide*.
