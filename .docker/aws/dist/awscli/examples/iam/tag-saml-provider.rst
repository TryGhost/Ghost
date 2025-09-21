**To add a tag to a SAML provider**

The following ``tag-saml-provider`` command adds a tag with a Department name to the specified SAML provider. ::

    aws iam tag-saml-provider \
        --saml-provider-arn arn:aws:iam::123456789012:saml-provider/ADFS \
        --tags '[{"Key": "Department", "Value": "Accounting"}]'

This command produces no output.

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.