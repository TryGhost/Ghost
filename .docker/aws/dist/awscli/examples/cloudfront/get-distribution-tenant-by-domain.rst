**To get distribution tenant information by domain**

The following ``get-distribution-tenant-by-domain`` example retrieves information about a distribution tenant using the specified domain. ::

    aws cloudfront get-distribution-tenant-by-domain \
        --domain example.com

Output::

    {
        "ETag": "E23ZP02F085ABC",
        "DistributionTenant": {
            "Id": "dt_2xVInRKCfUzQHgxosDs9hiLk1AB",
            "DistributionId": "E1XNX8R2GOAABC",
            "Name": "example-tenant-4",
            "Arn": "arn:aws:cloudfront::123456789012:distribution-tenant/dt_2xVInRKCfUzQHgxosDs9hiLk1AB",
            "Domains": [
                {
                    "Domain": "example.com",
                    "Status": "active"
                }
            ],
            "Parameters": [
                {
                    "Name": "testParam",
                    "Value": "defaultValue"
                }
            ],
            "ConnectionGroupId": "cg_2whCJoXMYCjHcxaLGrkllvyABC",
            "CreatedTime": "2025-05-23T16:16:20.871000+00:00",
            "LastModifiedTime": "2025-05-23T16:16:20.871000+00:00",
            "Enabled": false,
            "Status": "Deployed"
        }
    }

For more information, see `Understand how multi-tenant distributions work <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html>`__ in the *Amazon CloudFront Developer Guide*.
