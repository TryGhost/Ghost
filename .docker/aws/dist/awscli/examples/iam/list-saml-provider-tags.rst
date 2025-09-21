**To list the tags attached to a SAML provider**

The following ``list-saml-provider-tags`` command retrieves the list of tags associated with the specified SAML provider. ::

    aws iam list-saml-provider-tags \
        --saml-provider-arn arn:aws:iam::123456789012:saml-provider/ADFS

Output::

    {
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

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.