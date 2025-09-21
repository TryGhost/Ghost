**To replace the existing list of server certificate thumbprints with a new list**

This example updates the certificate thumbprint list for the OIDC provider whose ARN is 
``arn:aws:iam::123456789012:oidc-provider/example.oidcprovider.com`` to use a new thumbprint. ::

    aws iam update-open-id-connect-provider-thumbprint \
        --open-id-connect-provider-arn arn:aws:iam::123456789012:oidc-provider/example.oidcprovider.com \
        --thumbprint-list 7359755EXAMPLEabc3060bce3EXAMPLEec4542a3

This command produces no output.

For more information, see `Creating OpenID Connect (OIDC) identity providers <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html>`__ in the *AWS IAM User Guide*.