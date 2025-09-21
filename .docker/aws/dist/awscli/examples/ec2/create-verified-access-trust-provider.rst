**To create a Verified Access trust provider**

The following ``create-verified-access-trust-provider`` example sets up a Verified Access trust provider using AWS Identity Center. ::

    aws ec2 create-verified-access-trust-provider \
        --trust-provider-type user \
        --user-trust-provider-type iam-identity-center \
        --policy-reference-name idc \
        --tag-specifications ResourceType=verified-access-trust-provider,Tags=[{Key=Name,Value=my-va-trust-provider}]

Output::

    {
        "VerifiedAccessTrustProvider": {
            "VerifiedAccessTrustProviderId": "vatp-0bb32de759a3e19e7",
            "Description": "",
            "TrustProviderType": "user",
            "UserTrustProviderType": "iam-identity-center",
            "PolicyReferenceName": "idc",
            "CreationTime": "2023-08-25T18:40:36",
            "LastUpdatedTime": "2023-08-25T18:40:36",
            "Tags": [
                {
                    "Key": "Name",
                    "Value": "my-va-trust-provider"
                }
            ]
        }
    }

For more information, see `Trust providers for Verified Access <https://docs.aws.amazon.com/verified-access/latest/ug/trust-providers.html>`__ in the *AWS Verified Access User Guide*.
