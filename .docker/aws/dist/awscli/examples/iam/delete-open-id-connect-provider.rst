**To delete an IAM OpenID Connect identity provider**

This example deletes the IAM OIDC provider that connects to the provider ``example.oidcprovider.com``. ::

    aws iam delete-open-id-connect-provider \
        --open-id-connect-provider-arn arn:aws:iam::123456789012:oidc-provider/example.oidcprovider.com

This command produces no output.

For more information, see `Creating OpenID Connect (OIDC) identity providers <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html>`__ in the *AWS IAM User Guide*.