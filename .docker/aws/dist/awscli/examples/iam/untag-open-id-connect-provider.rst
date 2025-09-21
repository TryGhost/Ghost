**To remove a tag from an OIDC identity provider**

The following ``untag-open-id-connect-provider`` command removes any tag with the key name 'Department' from the specified OIDC identity provider. ::

    aws iam untag-open-id-connect-provider \
        --open-id-connect-provider-arn arn:aws:iam::123456789012:oidc-provider/server.example.com \
        --tag-keys Department

This command produces no output.

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.