**To remove a tag from a SAML provider**

The following ``untag-saml-provider`` command removes any tag with the key name 'Department' from the specified instance profile. ::

    aws iam untag-saml-provider \
        --saml-provider-arn arn:aws:iam::123456789012:saml-provider/ADFS \
        --tag-keys Department

This command produces no output.

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.