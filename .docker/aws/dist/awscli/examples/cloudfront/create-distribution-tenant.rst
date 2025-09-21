**Example 1: To create a CloudFront distribution tenant that uses a custom certificate**

The following ``create-distribution-tenant`` example creates a CloudFront distribution tenant that specifies customizations to disable WAF, add geo-restrictions, and uses another TLS certificate. ::

    aws cloudfront create-distribution-tenant \
        --cli-input-json file://tenant.json

Contents of ``tenant.json``::

    {
        "DistributionId": "E1XNX8R2GOAABC",
        "Domains": [
            {
                "Domain": "example.com"
            }
        ],
        "Parameters": [
            {
                "Name": "testParam",
                "Value": "defaultValue"
            }
        ],
        "ConnectionGroupId": "cg_2whCJoXMYCjHcxaLGrkllvyABC",
        "Enabled": false,
        "Tags": {
            "Items": [
                {
                    "Key": "tag",
                    "Value": "tagValue"
                }
            ]
        },
        "Name": "new-tenant-customizations",
        "Customizations": {
            "GeoRestrictions": {
                "Locations": ["DE"],
                "RestrictionType": "whitelist"
            },
            "WebAcl": {
                "Action": "disable"
            },
            "Certificate": {
                "Arn": "arn:aws:acm:us-east-1:123456789012:certificate/ec53f564-ea5a-4e4a-a0a2-e3c989449abc"
            }
        }
    }

Output::

    {
        "ETag": "E23ZP02F085ABC",
        "DistributionTenant": {
            "Id": "dt_2yN5tYwVbPKr7m2IB69M1yp1AB",
            "DistributionId": "E1XNX8R2GOAABC",
            "Name": "new-tenant-customizations",
            "Arn": "arn:aws:cloudfront::123456789012:distribution-tenant/dt_2yN5tYwVbPKr7m2IB69M1yp1AB",
            "Domains": [
                {
                    "Domain": "example.com",
                    "Status": "active"
                }
            ],
            "Tags": {
                "Items": [
                    {
                        "Key": "tag",
                        "Value": "tagValue"
                    }
                ]
            },
            "Customizations": {
                "WebAcl": {
                    "Action": "disable"
                },
                "Certificate": {
                    "Arn": "arn:aws:acm:us-east-1:123456789012:certificate/ec53f564-ea5a-4e4a-a0a2-e3c989449abc"
                },
                "GeoRestrictions": {
                    "RestrictionType": "whitelist",
                    "Locations": [
                        "DE"
                    ]
                }
            },
            "Parameters": [
                {
                    "Name": "testParam",
                    "Value": "defaultValue"
                }
            ],
            "ConnectionGroupId": "cg_2whCJoXMYCjHcxaLGrkllvyABC",
            "CreatedTime": "2025-06-11T17:20:06.432000+00:00",
            "LastModifiedTime": "2025-06-11T17:20:06.432000+00:00",
            "Enabled": false,
            "Status": "InProgress"
        }
    }

**Example 2: To create a distribution tenant with an inherited certificate**

The following ``create-distribution-tenant`` example creates a distribution tenant and specifies an inherited TLS certificate from the multi-tenant distribution. ::

    aws cloudfront create-distribution-tenant \
        --cli-input-json file://tenant.json

Contents of ``tenant.json``::

    {
        "DistributionId": "E1HVIAU7U12ABC",
        "Domains": [
            {
                "Domain": "example.com"
            }
        ],
        "Parameters": [
            {
                "Name": "tenantName",
                "Value": "first-tenant"
            }
        ],
        "Enabled": true,
        "Name": "new-tenant-no-cert"
    }

Output::

    {
        "ETag": "E23ZP02F0ABC",
        "DistributionTenant": {
            "Id": "dt_2zhRB0vBe0B72LZCVy1mgzI1AB",
            "DistributionId": "E1HVIAU7U12ABC",
            "Name": "new-tenant-no-cert",
            "Arn": "arn:aws:cloudfront::123456789012:distribution-tenant/dt_2zhRB0vBe0B72LZCVy1mgzI1AB",
            "Domains": [
                {
                    "Domain": "example.com",
                    "Status": "active"
                }
            ],
            "Parameters": [
                {
                    "Name": "tenantName",
                    "Value": "first-tenant"
                }
            ],
            "ConnectionGroupId": "cg_2yQEwpipGFN0hhA0ZemPabOABC",
            "CreatedTime": "2025-07-10T20:59:38.414000+00:00",
            "LastModifiedTime": "2025-07-10T20:59:38.414000+00:00",
            "Enabled": true,
            "Status": "InProgress"
        }
    }

**Example 3: To create a CloudFront distribution tenant using a CloudFront-hosted validation token**

The following ``create-distribution-tenant`` example creates a distribution tenant and uses a CloudFront-hosted validation token for your domain name. ::

    aws cloudfront create-distribution-tenant \
        --cli-input-json file://tenant.json

Contents of ``tenant.json``::

    {
        "DistributionId": "E2GJ5J9QN12ABC",
        "Domains": [
            {
                "Domain": "example.com"
            }
        ],
        "Parameters": [
            {
                "Name": "tenantName",
                "Value": "first-tenant"
            }
        ],
        "ConnectionGroupId": "cg_2yQEwpipGFN0hhA0ZemPabOABC",
        "Enabled": true,
        "Name": "new-tenant-cf-hosted",
        "ManagedCertificateRequest": {
            "ValidationTokenHost": "cloudfront"
        }
    }

**Important:** To successfully run this command, you must configure a CNAME DNS record that points your new domain (example.com) to the routing endpoint of the connection group that is associated with the distribution tenant. This CNAME record must also be propagated before CloudFront can successfully complete this request.

Output::

    {
        "ETag": "E23ZP02F0ABC",
        "DistributionTenant": {
            "Id": "dt_2zhStKrA524GvvTWJX92Ozl1AB",
            "DistributionId": "E2GJ5J9QN12ABC",
            "Name": "new-tenant-cf-hosted",
            "Arn": "arn:aws:cloudfront::123456789012:distribution-tenant/dt_2zhStKrA524GvvTWJX92Ozl1AB",
            "Domains": [
                {
                    "Domain": "example.com",
                    "Status": "inactive"
                }
            ],
            "Parameters": [
                {
                    "Name": "tenantName",
                    "Value": "first-tenant"
                }
            ],
            "ConnectionGroupId": "cg_2zhSaGatwwXjTjE42nneZzqABC",
            "CreatedTime": "2025-07-10T21:13:46.416000+00:00",
            "LastModifiedTime": "2025-07-10T21:13:46.416000+00:00",
            "Enabled": true,
            "Status": "InProgress"
        }
    }

**Example 4: To create a CloudFront distribution tenant using a self-hosted validation token**

The following ``create-distribution-tenant`` example creates a CloudFront distribution tenant and uses a self-hosted validation token. ::

    aws cloudfront create-distribution-tenant \
        --cli-input-json file://tenant.json

Contents of ``tenant.json``::

    {
        "DistributionId": "E2GJ5J9QN12ABC",
        "Domains": [
            {
                "Domain": "example.com"
            }
        ],
        "Parameters": [
            {
                "Name": "tenantName",
                "Value": "first-tenant"
            }
        ],
        "Enabled": true,
        "Name": "new-tenant-self-hosted",
        "ManagedCertificateRequest": {
            "ValidationTokenHost": "self-hosted"
        }
    }

Output::

    {
        "ETag": "E23ZP02F0ABC",
        "DistributionTenant": {
            "Id": "dt_2zhTFBV93OfFJJ3YMdNM5BC1AB",
            "DistributionId": "E2GJ5J9QN12ABC",
            "Name": "new-tenant-self-hosted",
            "Arn": "arn:aws:cloudfront::123456789012:distribution-tenant/dt_2zhTFBV93OfFJJ3YMdNM5BC1AB",
            "Domains": [
                {
                    "Domain": "example.com",
                    "Status": "inactive"
                }
            ],
            "Parameters": [
                {
                    "Name": "tenantName",
                    "Value": "first-tenant"
                }
            ],
            "ConnectionGroupId": "cg_2yQEwpipGFN0hhA0ZemPabOABC",
            "CreatedTime": "2025-07-10T21:16:39.828000+00:00",
            "LastModifiedTime": "2025-07-10T21:16:39.828000+00:00",
            "Enabled": true,
            "Status": "InProgress"
        }
    }

**Important:** After you run this command, the distribution tenant will be created without validation. To validate the managed certificate request and configure the DNS when you're ready to start receiving traffic, see `Complete domain setup <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/managed-cloudfront-certificates.html#complete-domain-ownership>`__ in the *Amazon CloudFront Developer Guide*.

For more information about creating distribution tenants, see `Create a distribution <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-creating-console.html>`__ in the *Amazon CloudFront Developer Guide*.