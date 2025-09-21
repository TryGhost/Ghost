**To retrieve the SAML provider metadocument**

This example retrieves the details about the SAML 2.0 provider whose ARM is ``arn:aws:iam::123456789012:saml-provider/SAMLADFS``. 
The response includes the metadata document that you got from the identity provider to create the AWS SAML provider entity as well 
as the creation and expiration dates. ::

    aws iam get-saml-provider \
        --saml-provider-arn arn:aws:iam::123456789012:saml-provider/SAMLADFS 

Output::

    {
        "SAMLMetadataDocument": "...SAMLMetadataDocument-XML...",
        "CreateDate": "2017-03-06T22:29:46+00:00",
        "ValidUntil": "2117-03-06T22:29:46.433000+00:00",
        "Tags": [
            {
                "Key": "DeptID",
                "Value": "123456"
            },
            {
                "Key": "Department",
                "Value": "Accounting"
            }
        ]
    }

For more information, see `Creating IAM SAML identity providers <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_saml.html>`__ in the *AWS IAM User Guide*.