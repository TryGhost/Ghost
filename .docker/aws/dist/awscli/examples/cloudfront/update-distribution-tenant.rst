**To update a CloudFront distribution tenant**

The following ``update-distribution-tenant`` example updates a CloudFront distribution tenant with a new parameter value and adds a country to the geo-restrictions. ::

    aws cloudfront update-distribution-tenant \
        --cli-input-json file://update-tenant.json

Contents of ``update-tenant.json``::

    {
        "Id": "dt_2yMvQgam3QkJo2z54FDl91dk1AB",
        "IfMatch": "E1F83G8C2ARABC",
        "Parameters": [
            {
                "Name": "testParam",
                "Value": "newParameterValue"
            }
        ],
        "Customizations": {
            "WebAcl": {
                "Action": "disable"
            },
            "GeoRestrictions": {
                "RestrictionType": "whitelist",
                "Locations": [
                    "DE",
                    "GB",
                    "ES"
                ]
            }
        }
    }

Output::

    {
        "ETag": "E1PA6795UKMABC",
        "DistributionTenant": {
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
            "Customizations": {
                "WebAcl": {
                    "Action": "disable"
                },
                "GeoRestrictions": {
                    "RestrictionType": "whitelist",
                    "Locations": [
                        "DE",
                        "ES",
                        "GB"
                    ]
                }
            },
            "Parameters": [
                {
                    "Name": "testParam",
                    "Value": "newParameterValue"
                }
            ],
            "ConnectionGroupId": "cg_2whCJoXMYCjHcxaLGrkllvyABC",
            "CreatedTime": "2025-06-11T15:54:02.142000+00:00",
            "LastModifiedTime": "2025-06-11T16:42:45.531000+00:00",
            "Enabled": false,
            "Status": "InProgress"
        }
    }

For more information, see `Distribution tenant customizations <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/tenant-customization.html>`__ in the *Amazon CloudFront Developer Guide*.