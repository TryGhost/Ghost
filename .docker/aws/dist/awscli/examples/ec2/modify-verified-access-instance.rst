**To modify the configuration of a Verified Access instance**

The following ``modify-verified-access-instance`` example adds the specified description to the specified Verified Access instance. ::

    aws ec2 modify-verified-access-instance \
        --verified-access-instance-id vai-0ce000c0b7643abea \
        --description "Testing Verified Access"

Output::

    {
        "VerifiedAccessInstance": {
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
            "LastUpdatedTime": "2023-08-25T22:41:04"
        }
    }

For more information, see `Verified Access instances <https://docs.aws.amazon.com/verified-access/latest/ug/verified-access-instances.html>`__ in the *AWS Verified Access User Guide*.
