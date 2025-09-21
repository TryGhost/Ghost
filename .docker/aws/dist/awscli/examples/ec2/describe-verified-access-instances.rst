**To describe a Verified Access instance**

The following ``describe-verified-access-instances`` example describes the specified Verified Access instance. ::

    aws ec2 describe-verified-access-instances \
        --verified-access-instance-ids vai-0ce000c0b7643abea

Output::

    {
        "VerifiedAccessInstances": [
            {
                "VerifiedAccessInstanceId": "vai-0ce000c0b7643abea",
                "Description": "Testing Verified Access",
                "VerifiedAccessTrustProviders": [
                    {
                        "VerifiedAccessTrustProviderId": "vatp-0bb32de759a3e19e7",
                        "TrustProviderType": "user",
                        "UserTrustProviderType": "iam-identity-center"
                    }
                ],
                "CreationTime": "2023-08-25T18:27:56",
                "LastUpdatedTime": "2023-08-25T19:03:32",
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "my-ava-instance"
                    }
                ]
            }
        ]
    }

For more information, see `Verified Access instances <https://docs.aws.amazon.com/verified-access/latest/ug/verified-access-instances.html>`__ in the *AWS Verified Access User Guide*.
