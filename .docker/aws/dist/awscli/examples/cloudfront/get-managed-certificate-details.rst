**To get managed certificate details**

The following ``get-managed-certificate-details`` example retrieves the details of a CloudFront managed ACM certificate. ::

    aws cloudfront get-managed-certificate-details \
        --identifier dt_2wjDZi3hD1ivOXf6rpZJOSNE1AB

Output::

    {
        "ManagedCertificateDetails": {
            "CertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/655dc1fe-6d37-451d-a013-c2db3a034abc",
            "CertificateStatus": "pending-validation",
            "ValidationTokenHost": "self-hosted",
            "ValidationTokenDetails": [
                {
                    "Domain": "example.com",
                    "RedirectTo": "validation.us-east-1.acm-validations.aws/123456789012/.well-known/pki-validation/b315c9ae21284e7918bb9f3f422ab1c7.txt",
                    "RedirectFrom": "example.com/.well-known/pki-validation/b315c9ae21284e7918bb9f3f422ac3c7.txt"
                }
            ]
        }
    }

For more information, see `Request certificates for your CloudFront distribution tenant <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/managed-cloudfront-certificates.html>`__ in the *Amazon CloudFront Developer Guide*.
