**To list the tags attached to an OpenID Connect (OIDC)-compatible identity provider**

The following ``list-open-id-connect-provider-tags`` command retrieves the list of tags associated with the specified OIDC identity provider. ::

    aws iam list-open-id-connect-provider-tags \
        --open-id-connect-provider-arn arn:aws:iam::123456789012:oidc-provider/server.example.com

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