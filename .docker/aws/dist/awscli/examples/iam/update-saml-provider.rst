**To update the metadata document for an existing SAML provider**

This example updates the SAML provider in IAM whose ARN is ``arn:aws:iam::123456789012:saml-provider/SAMLADFS`` with a new SAML metadata document from the file ``SAMLMetaData.xml``. ::

    aws iam update-saml-provider \
        --saml-metadata-document file://SAMLMetaData.xml \
        --saml-provider-arn arn:aws:iam::123456789012:saml-provider/SAMLADFS 

Output::

    {
        "SAMLProviderArn": "arn:aws:iam::123456789012:saml-provider/SAMLADFS"
    }

For more information, see `Creating IAM SAML identity providers <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_saml.html>`__ in the *AWS IAM User Guide*.