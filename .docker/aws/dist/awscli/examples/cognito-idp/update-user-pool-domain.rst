**To update a custom domain**

The following ``update-user-pool-domain`` example configures the branding version and certificate for the custom domain the requested user pool. ::

    aws cognito-idp update-user-pool-domain \
        --user-pool-id ca-central-1_EXAMPLE \
        --domain auth.example.com \
        --managed-login-version 2 \
        --custom-domain-config CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "CloudFrontDomain": "example.cloudfront.net",
        "ManagedLoginVersion": 2
    }

For more information, see `Managed login <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-managed-login.html>`__ and `Configuring a domain <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-assign-domain.html>`__ in the *Amazon Cognito Developer Guide*.
