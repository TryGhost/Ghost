**To update a user pool identity provider**

The following ``update-identity-provider`` example updates the OIDC provider "MyOIDCIdP" in the requested user pool. ::

    aws cognito-idp update-identity-provider \
        --cli-input-json file://update-identity-provider.json

Contents of ``update-identity-provider.json``::

    {
       "AttributeMapping": {
                "email": "idp_email",
                "email_verified": "idp_email_verified",
                "username": "sub"
        },
        "CreationDate": 1.701129701653E9,
        "IdpIdentifiers": [
            "corp",
            "dev"
        ],
        "LastModifiedDate": 1.701129701653E9,
        "ProviderDetails": {
            "attributes_request_method": "GET",
            "attributes_url": "https://example.com/userInfo",
            "attributes_url_add_attributes": "false",
            "authorize_scopes": "openid profile",
            "authorize_url": "https://example.com/authorize",
            "client_id": "idpexampleclient123",
            "client_secret": "idpexamplesecret456",
            "jwks_uri": "https://example.com/.well-known/jwks.json",
            "oidc_issuer": "https://example.com",
            "token_url": "https://example.com/token"
        },
        "ProviderName": "MyOIDCIdP",
        "UserPoolId": "us-west-2_EXAMPLE"
    }

Output::

    {
        "IdentityProvider": {
            "AttributeMapping": {
                "email": "idp_email",
                "email_verified": "idp_email_verified",
                "username": "sub"
            },
            "CreationDate": 1701129701.653,
            "IdpIdentifiers": [
                "corp",
                "dev"
            ],
            "LastModifiedDate": 1736444278.211,
            "ProviderDetails": {
                "attributes_request_method": "GET",
                "attributes_url": "https://example.com/userInfo",
                "attributes_url_add_attributes": "false",
                "authorize_scopes": "openid profile",
                "authorize_url": "https://example.com/authorize",
                "client_id": "idpexampleclient123",
                "client_secret": "idpexamplesecret456",
                "jwks_uri": "https://example.com/.well-known/jwks.json",
                "oidc_issuer": "https://example.com",
                "token_url": "https://example.com/token"
            },
            "ProviderName": "MyOIDCIdP",
            "ProviderType": "OIDC",
            "UserPoolId": "us-west-2_EXAMPLE"
        }
    }

For more information, see `Configuring a domain <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-assign-domain.html>`__ in the *Amazon Cognito Developer Guide*.
