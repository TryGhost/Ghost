**To get details about a CloudFront distribution tenant**

The following ``get-distribution-tenant`` example retrieves information about a CloudFront distribution tenant. ::

    aws cloudfront get-distribution-tenant \
        --id dt_2wjDZi3hD1ivOXf6rpZJOSNE1AB

Output::

    {
        "ETag": "E23ZP02F085ABC",
        "DistributionTenant": {
            "Id": "dt_2wjDZi3hD1ivOXf6rpZJOSNE1AB",
            "DistributionId": "E1XNX8R2GOAABC",
            "Name": "example-tenant-2",
            "Arn": "arn:aws:cloudfront::123456789012:distribution-tenant/dt_2wjDZi3hD1ivOXf6rpZJOSNE1AB",
            "Domains": [
                {
                    "Domain": "example.com",
                    "Status": "inactive"
                }
            ],
            "ConnectionGroupId": "cg_2wjDWTBKTlRB87cAaUQFaakABC",
            "CreatedTime": "2025-05-06T15:42:28.542000+00:00",
            "LastModifiedTime": "2025-05-06T15:42:37.724000+00:00",
            "Enabled": true,
            "Status": "InProgress"
        }
    }

For more information, see `Understand how multi-tenant distributions work <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html>`__ in the *Amazon CloudFront Developer Guide*.