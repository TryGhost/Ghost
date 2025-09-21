**To describe a Verified Access trust provider**

The following ``describe-verified-access-trust-providers`` example describes the specified Verified Access trust provider. ::

    aws ec2 describe-verified-access-trust-providers \
        --verified-access-trust-provider-ids vatp-0bb32de759a3e19e7

Output::

    {
        "VerifiedAccessTrustProviders": [
            {
                "VerifiedAccessTrustProviderId": "vatp-0bb32de759a3e19e7",
                "Description": "Testing Verified Access",
                "TrustProviderType": "user",
                "UserTrustProviderType": "iam-identity-center",
                "PolicyReferenceName": "idc",
                "CreationTime": "2023-08-25T19:00:38",
                "LastUpdatedTime": "2023-08-25T19:03:32",
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "my-va-trust-provider"
                    }
                ]
            }
        ]
    }

For more information, see `Trust providers for Verified Access <https://docs.aws.amazon.com/verified-access/latest/ug/trust-providers.html>`__ in the *AWS Verified Access User Guide*.
