**To get the configuration of an identity provider from the IdP identifier**

The following ``get-identity-provider-by-identifier`` example returns the configuration of the identity provider with the identifier ``mysso``. ::

    aws cognito-idp get-identity-provider-by-identifier \
        --user-pool-id us-west-2_EXAMPLE \
        --idp-identifier mysso

Output::

    {
        "IdentityProvider": {
            "UserPoolId": "us-west-2_EXAMPLE",
            "ProviderName": "MYSAML",
            "ProviderType": "SAML",
            "ProviderDetails": {
                "ActiveEncryptionCertificate": "[Certificate contents]",
                "IDPSignout": "false",
                "MetadataURL": "https://auth.example.com/saml/metadata/",
                "SLORedirectBindingURI": "https://auth.example.com/saml/logout/",
                "SSORedirectBindingURI": "https://auth.example.com/saml/assertion/"
            },
            "AttributeMapping": {
                "email": "email"
            },
            "IdpIdentifiers": [
                "mysso",
                "mysamlsso"
            ],
            "LastModifiedDate": 1705616729.188,
            "CreationDate": 1643734622.919
        }
    }

For more information, see `Third-party IdP sign-in <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html>`__ in the *Amazon Cognito Developer Guide*.
