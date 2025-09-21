**To remove the specified client ID from the list of client IDs registered for the specified IAM OpenID Connect provider**

This example removes the client ID ``My-TestApp-3`` from the list of client IDs associated with the IAM OIDC provider whose 
ARN is ``arn:aws:iam::123456789012:oidc-provider/example.oidcprovider.com``. ::

    aws iam remove-client-id-from-open-id-connect-provider 
        --client-id My-TestApp-3 \
        --open-id-connect-provider-arn arn:aws:iam::123456789012:oidc-provider/example.oidcprovider.com

This command produces no output.

For more information, see `Creating OpenID Connect (OIDC) identity providers <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html>`__ in the *AWS IAM User Guide*.