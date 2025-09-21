**To list identity providers**

The following ``list-identity-providers`` example lists the first two identity providers in the requested user pool. ::

    aws cognito-idp list-identity-providers \
        --user-pool-id us-west-2_EXAMPLE \
        --max-items 2

Output::

    {
        "Providers": [
            {
                "CreationDate": 1619477386.504,
                "LastModifiedDate": 1703798328.142,
                "ProviderName": "Azure",
                "ProviderType": "SAML"
            },
            {
                "CreationDate": 1642698776.175,
                "LastModifiedDate": 1642699086.453,
                "ProviderName": "LoginWithAmazon",
                "ProviderType": "LoginWithAmazon"
            }
        ],
        "NextToken": "[Pagination token]"
    }

For more information, see `Third-party IdP sign-in <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html>`__ in the *Amazon Cognito Developer Guide*.
