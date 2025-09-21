**To list CloudFront distribution tenants**

The following ``list-distribution-tenants`` example lists 3 CloudFront distribution tenants in your AWS account by the associated connection group. ::

    aws cloudfront list-distribution-tenants \
        --association-filter ConnectionGroupId=cg_2whCJoXMYCjHcxaLGrkllvyABC \
        --max-items 3

Output::

    {
        "DistributionTenantList": [
            {
                "Id": "dt_2yMvQgam3QkJo2z54FDl91dk1AB",
                "DistributionId": "E1XNX8R2GOAABC",
                "Name": "new-tenant-customizations",
                "Arn": "arn:aws:cloudfront::123456789012:distribution-tenant/dt_2yMvQgam3QkJo2z54FDl91dk1AB",
                "Domains": [
                    {
                        "Domain": "example.com",
                        "Status": "active"
                    }
                ],
                "ConnectionGroupId": "cg_2whCJoXMYCjHcxaLGrkllvyABC",
                "Customizations": {
                    "WebAcl": {
                        "Action": "disable"
                    },
                    "GeoRestrictions": {
                        "RestrictionType": "whitelist",
                        "Locations": [
                            "DE"
                        ]
                    }
                },
                "CreatedTime": "2025-06-11T15:54:02.142000+00:00",
                "LastModifiedTime": "2025-06-11T15:54:02.142000+00:00",
                "ETag": "E23ZP02F085ABC",
                "Enabled": false,
                "Status": "Deployed"
            },
            {
                "Id": "dt_2yMuV7NJuBcAB0cwwxMCBZQ1AB",
                "DistributionId": "E1XNX8R2GOAABC",
                "Name": "new-tenant",
                "Arn": "arn:aws:cloudfront::123456789012:distribution-tenant/dt_2yMuV7NJuBcAB0cwwxMCBZQ1AB",
                "Domains": [
                    {
                        "Domain": "1.example.com",
                        "Status": "active"
                    }
                ],
                "ConnectionGroupId": "cg_2whCJoXMYCjHcxaLGrkllvyABC",
                "Customizations": {
                    "GeoRestrictions": {
                        "RestrictionType": "whitelist",
                        "Locations": [
                            "DE"
                        ]
                    }
                },
                "CreatedTime": "2025-06-11T15:46:23.466000+00:00",
                "LastModifiedTime": "2025-06-11T15:46:23.466000+00:00",
                "ETag": "E23ZP02F085ABC",
                "Enabled": false,
                "Status": "Deployed"
            },
            {
                "Id": "dt_2xVInRKCfUzQHgxosDs9hiLk1AB",
                "DistributionId": "E1XNX8R2GOAABC",
                "Name": "new-tenant-2",
                "Arn": "arn:aws:cloudfront::123456789012:distribution-tenant/dt_2xVInRKCfUzQHgxosDs9hiLk1AB",
                "Domains": [
                    {
                        "Domain": "2.example.com",
                        "Status": "active"
                    }
                ],
                "ConnectionGroupId": "cg_2whCJoXMYCjHcxaLGrkllvyABC",
                "CreatedTime": "2025-05-23T16:16:20.871000+00:00",
                "LastModifiedTime": "2025-05-23T16:16:20.871000+00:00",
                "ETag": "E23ZP02F085ABC",
                "Enabled": false,
                "Status": "Deployed"
            }
        ],
        "NextToken": "eyJNYXJrZXIiOiBudWxsLCAiYm90b190cnVuY2F0ZV9hbW91bnQiOiAzfQ=="
    }

For more information, see `Understand how multi-tenant distributions work <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html>`__ in the *Amazon CloudFront Developer Guide*.
