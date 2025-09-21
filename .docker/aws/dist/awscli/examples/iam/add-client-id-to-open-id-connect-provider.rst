**To add a client ID (audience) to an Open-ID Connect (OIDC) provider**

The following ``add-client-id-to-open-id-connect-provider`` command adds the client ID ``my-application-ID`` to the OIDC provider named ``server.example.com``. ::

    aws iam add-client-id-to-open-id-connect-provider \
        --client-id my-application-ID \
        --open-id-connect-provider-arn arn:aws:iam::123456789012:oidc-provider/server.example.com

This command produces no output.

To create an OIDC provider, use the ``create-open-id-connect-provider`` command.

For more information, see `Creating OpenID Connect (OIDC) identity providers <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html>`__ in the *AWS IAM User Guide*.