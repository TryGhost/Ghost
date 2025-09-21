**Example 1: To create a user pool domain**

The following ``create-user-pool-domain`` example creates a new custom domain. ::

    aws cognito-idp create-user-pool-domain \
        --user-pool-id us-west-2_EXAMPLE \
        --domain auth.example.com \
        --custom-domain-config CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222

Output::

    {
        "CloudFrontDomain": "example1domain.cloudfront.net"
    }

For more information, see `Configuring a user pool domain <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-assign-domain.html>`__ in the *Amazon Cognito Developer Guide*.

**Example 2: To create a user pool domain**

The following ``create-user-pool-domain`` example creates a new domain with a service-owned prefix. ::

    aws cognito-idp create-user-pool-domain \
        --user-pool-id us-west-2_EXAMPLE2 \
        --domain mydomainprefix

For more information, see `Configuring a user pool domain <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-assign-domain.html>`__ in the *Amazon Cognito Developer Guide*.
