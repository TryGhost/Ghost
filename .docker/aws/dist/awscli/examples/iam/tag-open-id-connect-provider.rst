**To add a tag to an OpenID Connect (OIDC)-compatible identity provider**

The following ``tag-open-id-connect-provider`` command adds a tag with a Department name to the specified OIDC identity provider. ::

    aws iam tag-open-id-connect-provider \
        --open-id-connect-provider-arn arn:aws:iam::123456789012:oidc-provider/server.example.com \
        --tags '[{"Key": "Department", "Value": "Accounting"}]'

This command produces no output.

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.