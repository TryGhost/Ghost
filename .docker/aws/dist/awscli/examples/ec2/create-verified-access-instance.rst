**To create a Verified Access instance**

The following ``create-verified-access-instance`` example creates a Verified Access instance with a Name tag. ::

    aws ec2 create-verified-access-instance \
        --tag-specifications ResourceType=verified-access-instance,Tags=[{Key=Name,Value=my-va-instance}]

Output::

    {
        "VerifiedAccessInstance": {
            "VerifiedAccessInstanceId": "vai-0ce000c0b7643abea",
            "Description": "",
            "VerifiedAccessTrustProviders": [],
            "CreationTime": "2023-08-25T18:27:56",
            "LastUpdatedTime": "2023-08-25T18:27:56",
            "Tags": [
                {
                    "Key": "Name",
                    "Value": "my-va-instance"
                }
            ]
        }
    }

For more information, see `Verified Access instances <https://docs.aws.amazon.com/verified-access/latest/ug/verified-access-instances.html>`__ in the *AWS Verified Access User Guide*.
