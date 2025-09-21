**To modify the configuration of a Verified Access trust provider**

The following ``modify-verified-access-trust-provider`` example adds the specified description to the specified Verified Access trust provider. ::

    aws ec2 modify-verified-access-trust-provider \
        --verified-access-trust-provider-id vatp-0bb32de759a3e19e7 \
        --description "Testing Verified Access"

Output::

    {
        "VerifiedAccessTrustProvider": {
            "VerifiedAccessTrustProviderId": "vatp-0bb32de759a3e19e7",
            "Description": "Testing Verified Access",
            "TrustProviderType": "user",
            "UserTrustProviderType": "iam-identity-center",
            "PolicyReferenceName": "idc",
            "CreationTime": "2023-08-25T19:00:38",
            "LastUpdatedTime": "2023-08-25T19:18:21"
        }
    }

For more information, see `Trust providers for Verified Access <https://docs.aws.amazon.com/verified-access/latest/ug/trust-providers.html>`__ in the *AWS Verified Access User Guide*.
