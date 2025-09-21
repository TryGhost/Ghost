**To list CloudFront origin access identities**

The following example gets a list of the CloudFront origin access identities
(OAIs) in your AWS account::

    aws cloudfront list-cloud-front-origin-access-identities

Output::

    {
        "CloudFrontOriginAccessIdentityList": {
            "Items": [
                {
                    "Id": "E74FTE3AEXAMPLE",
                    "S3CanonicalUserId": "cd13868f797c227fbea2830611a26fe0a21ba1b826ab4bed9b7771c9aEXAMPLE",
                    "Comment": "Example OAI"
                },
                {
                    "Id": "EH1HDMBEXAMPLE",
                    "S3CanonicalUserId": "1489f6f2e6faacaae7ff64c4c3e6956c24f78788abfc1718c3527c263bf7a17EXAMPLE",
                    "Comment": "Test OAI"
                },
                {
                    "Id": "E2X2C9TEXAMPLE",
                    "S3CanonicalUserId": "cbfeebb915a64749f9be546a45b3fcfd3a31c779673c13c4dd460911ae402c2EXAMPLE",
                    "Comment": "Example OAI #2"
                }
            ]
        }
    }
