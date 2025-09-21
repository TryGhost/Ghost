**To delete a Verified Access trust provider**

The following ``delete-verified-access-trust-provider`` example deletes the specified Verified Access trust provider. ::

    aws ec2 delete-verified-access-trust-provider \
        --verified-access-trust-provider-id vatp-0bb32de759a3e19e7

Output::

    {
        "VerifiedAccessTrustProvider": {
            "VerifiedAccessTrustProviderId": "vatp-0bb32de759a3e19e7",
            "Description": "Testing Verified Access",
            "TrustProviderType": "user",
            "UserTrustProviderType": "iam-identity-center",
            "PolicyReferenceName": "idc",
            "CreationTime": "2023-08-25T18:40:36",
            "LastUpdatedTime": "2023-08-25T18:40:36"
        }
    }

For more information, see `Trust providers for Verified Access <https://docs.aws.amazon.com/verified-access/latest/ug/trust-providers.html>`__ in the *AWS Verified Access User Guide*.
