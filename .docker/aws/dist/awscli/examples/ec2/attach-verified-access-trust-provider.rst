**To attach a trust provider to an instance**

The following ``attach-verified-access-trust-provider`` example attaches the specified Verified Access trust provider to the specified Verified Access instance. ::

    aws ec2 attach-verified-access-trust-provider \
        --verified-access-instance-id vai-0ce000c0b7643abea \
        --verified-access-trust-provider-id vatp-0bb32de759a3e19e7

Output::

    {
        "VerifiedAccessTrustProvider": {
            "VerifiedAccessTrustProviderId": "vatp-0bb32de759a3e19e7",
            "Description": "",
            "TrustProviderType": "user",
            "UserTrustProviderType": "iam-identity-center",
            "PolicyReferenceName": "idc",
            "CreationTime": "2023-08-25T19:00:38",
            "LastUpdatedTime": "2023-08-25T19:00:38"
        },
        "VerifiedAccessInstance": {
            "VerifiedAccessInstanceId": "vai-0ce000c0b7643abea",
            "Description": "",
            "VerifiedAccessTrustProviders": [
                {
                    "VerifiedAccessTrustProviderId": "vatp-0bb32de759a3e19e7",
                    "TrustProviderType": "user",
                    "UserTrustProviderType": "iam-identity-center"
                }
            ],
            "CreationTime": "2023-08-25T18:27:56",
            "LastUpdatedTime": "2023-08-25T18:27:56"
        }
    }

For more information, see `Verified Access instances <https://docs.aws.amazon.com/verified-access/latest/ug/verified-access-instances.html>`__ in the *AWS Verified Access User Guide*.
