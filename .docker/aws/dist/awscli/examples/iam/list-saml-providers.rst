**To list the SAML providers in the AWS account**

This example retrieves the list of SAML 2.0 providers created in the current AWS account. ::

    aws iam list-saml-providers

Output::

    {
        "SAMLProviderList": [
            {
                "Arn": "arn:aws:iam::123456789012:saml-provider/SAML-ADFS",
                "ValidUntil": "2015-06-05T22:45:14Z",
                "CreateDate": "2015-06-05T22:45:14Z"
            }
        ]
    }

For more information, see `Creating IAM SAML identity providers <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_saml.html>`__ in the *AWS IAM User Guide*.