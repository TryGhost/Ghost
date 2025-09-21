**Example 1: To create a user pool SAML identity provider (IdP) with a metadata URL**

The following ``create-identity-provider`` example creates a new SAML IdP with metadata from a public URL, attribute mapping, and two identifiers. ::

    aws cognito-idp create-identity-provider \
        --user-pool-id us-west-2_EXAMPLE \
        --provider-name MySAML \
        --provider-type SAML \
        --provider-details IDPInit=true,IDPSignout=true,EncryptedResponses=true,MetadataURL=https://auth.example.com/sso/saml/metadata,RequestSigningAlgorithm=rsa-sha256 \
        --attribute-mapping email=emailaddress,phone_number=phone,custom:111=department \
        --idp-identifiers CorpSAML WestSAML

Output::

    {
        "IdentityProvider": {
            "UserPoolId": "us-west-2_EXAMPLE",
            "ProviderName": "MySAML",
            "ProviderType": "SAML",
            "ProviderDetails": {
                "ActiveEncryptionCertificate": "MIICvTCCAaEXAMPLE",
                "EncryptedResponses": "true",
                "IDPInit": "true",
                "IDPSignout": "true",
                "MetadataURL": "https://auth.example.com/sso/saml/metadata",
                "RequestSigningAlgorithm": "rsa-sha256",
                "SLORedirectBindingURI": "https://auth.example.com/slo/saml",
                "SSORedirectBindingURI": "https://auth.example.com/sso/saml"
            },
            "AttributeMapping": {
                "custom:111": "department",
                "emailaddress": "email",
                "phone": "phone_number"
            },
            "IdpIdentifiers": [
                "CorpSAML",
                "WestSAML"
            ],
            "LastModifiedDate": 1726853833.977,
            "CreationDate": 1726853833.977
        }
    }

For more information, see `Adding user pool sign-in through a third party <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html>`__ in the *Amazon Cognito Developer Guide*.

**Example 2: To create a user pool SAML identity provider (IdP) with a metadata file**

The following ``create-identity-provider`` example creates a new SAML IdP with metadata from a file, attribute mapping, and two identifiers. File syntax can differ between operating systems in the ``--provider-details`` parameter. It's easiest to create a JSON input file for this operation.::

    aws cognito-idp create-identity-provider \
        --cli-input-json file://.\SAML-identity-provider.json

Contents of ``SAML-identity-provider.json``::

    {
        "AttributeMapping": { 
            "email" : "idp_email",
            "email_verified" : "idp_email_verified"
        },
        "IdpIdentifiers": [ "platform" ],
        "ProviderDetails": { 
            "MetadataFile": "<md:EntityDescriptor xmlns:md=\"urn:oasis:names:tc:SAML:2.0:metadata\" entityID=\"http://www.example.com/sso\"><md:IDPSSODescriptor WantAuthnRequestsSigned=\"false\" protocolSupportEnumeration=\"urn:oasis:names:tc:SAML:2.0:protocol\"><md:KeyDescriptor use=\"signing\"><ds:KeyInfo xmlns:ds=\"http://www.w3.org/2000/09/xmldsig#\"><ds:X509Data><ds:X509Certificate>[IDP_CERTIFICATE_DATA]</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor><md:SingleLogoutService Binding=\"urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST\" Location=\"https://www.example.com/slo/saml\"/><md:SingleLogoutService Binding=\"urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect\" Location=\"https://www.example.com/slo/saml\"/><md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified</md:NameIDFormat><md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat><md:SingleSignOnService Binding=\"urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST\" Location=\"https://www.example.com/sso/saml\"/><md:SingleSignOnService Binding=\"urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect\" Location=\"https://www.example.com/sso/saml\"/></md:IDPSSODescriptor></md:EntityDescriptor>",
            "IDPSignout" : "true",
            "RequestSigningAlgorithm" : "rsa-sha256",
            "EncryptedResponses" : "true",
            "IDPInit" : "true"
        },
        "ProviderName": "MySAML2",
        "ProviderType": "SAML",
        "UserPoolId": "us-west-2_EXAMPLE"
    }

Output::

    {
        "IdentityProvider": {
            "UserPoolId": "us-west-2_EXAMPLE",
            "ProviderName": "MySAML2",
            "ProviderType": "SAML",
            "ProviderDetails": {
                "ActiveEncryptionCertificate": "[USER_POOL_ENCRYPTION_CERTIFICATE_DATA]",
                "EncryptedResponses": "true",
                "IDPInit": "true",
                "IDPSignout": "true",
                "MetadataFile": "<md:EntityDescriptor xmlns:md=\"urn:oasis:names:tc:SAML:2.0:metadata\" entityID=\"http://www.example.com/sso\"><md:IDPSSODescriptor WantAuthnRequestsSigned=\"false\" protocolSupportEnumeration=\"urn:oasis:names:tc:SAML:2.0:protocol\"><md:KeyDescriptor use=\"signing\"><ds:KeyInfo xmlns:ds=\"http://www.w3.org/2000/09/xmldsig#\"><ds:X509Data><ds:X509Certificate>[IDP_CERTIFICATE_DATA]</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor><md:SingleLogoutService Binding=\"urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST\" Location=\"https://www.example.com/slo/saml\"/><md:SingleLogoutService Binding=\"urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect\" Location=\"https://www.example.com/slo/saml\"/><md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified</md:NameIDFormat><md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat><md:SingleSignOnService Binding=\"urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST\" Location=\"https://www.example.com/sso/saml\"/><md:SingleSignOnService Binding=\"urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect\" Location=\"https://www.example.com/sso/saml\"/></md:IDPSSODescriptor></md:EntityDescriptor>",
                "RequestSigningAlgorithm": "rsa-sha256",
                "SLORedirectBindingURI": "https://www.example.com/slo/saml",
                "SSORedirectBindingURI": "https://www.example.com/sso/saml"
            },
            "AttributeMapping": {
                "email": "idp_email",
                "email_verified": "idp_email_verified"
            },
            "IdpIdentifiers": [
                "platform"
            ],
            "LastModifiedDate": 1726855290.731,
            "CreationDate": 1726855290.731
        }
    }

For more information, see `Adding user pool sign-in through a third party <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html>`__ in the *Amazon Cognito Developer Guide*.