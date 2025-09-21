**To list distribution tenants by customization**

The following ``list-distribution-tenants-by-customization`` example lists distribution tenants that use the specified web ACL. ::

    aws cloudfront list-distribution-tenants-by-customization \
        --web-acl-arn arn:aws:wafv2:us-east-1:123456789012:global/webacl/CreatedByCloudFront-0273cd2f/a3c19bce-42b5-48a1-a8d4-b2bb2f28eabc

Output::

    {
        "DistributionTenantList": [
            {
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
                "Customizations": {
                    "WebAcl": {
                        "Action": "override",
                        "Arn": "arn:aws:wafv2:us-east-1:123456789012:global/webacl/CreatedByCloudFront-0273cd2f/a3c19bce-42b5-48a1-a8d4-b2bb2f28eabc"
                    },
                    "GeoRestrictions": {
                        "RestrictionType": "whitelist",
                        "Locations": [
                            "AL"
                        ]
                    }
                },
                "CreatedTime": "2025-05-06T15:42:28.542000+00:00",
                "LastModifiedTime": "2025-05-06T16:14:08.710000+00:00",
                "ETag": "E1F83G8C2ARABC",
                "Enabled": true,
                "Status": "Deployed"
            }
        ]
    }

For more information, see `Distribution tenant customizations <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/tenant-customization.html>`__ in the *Amazon CloudFront Developer Guide*.
