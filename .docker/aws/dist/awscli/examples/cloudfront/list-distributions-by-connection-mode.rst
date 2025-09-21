**To list CloudFront distributions by connection mode**

The following ``list-distributions-by-connection-mode`` example lists CloudFront distributions with the specified connection mode. ::

    aws cloudfront list-distributions-by-connection-mode \
        --connection-mode tenant-only

Output::

    {
        "DistributionList": {
            "Items": [
                {
                    "Id": "E1XNX8R2GOAABC",
                    "ARN": "arn:aws:cloudfront::123456789012:distribution/E1XNX8R2GOAABC",
                    "ETag": "EPT4JPJQDY1ABC",
                    "Status": "Deployed",
                    "LastModifiedTime": "2025-05-23T16:16:15.691000+00:00",
                    "DomainName": "-",
                    "Aliases": {
                        "Quantity": 0
                    },
                    "Origins": {
                        "Quantity": 1,
                        "Items": [
                            {
                                "Id": "example-cfn-simple-distribution123",
                                "DomainName": "example.com",
                                "OriginPath": "",
                                "CustomHeaders": {
                                    "Quantity": 0
                                },
                                "S3OriginConfig": {
                                    "OriginAccessIdentity": ""
                                },
                                "ConnectionAttempts": 3,
                                "ConnectionTimeout": 10,
                                "OriginShield": {
                                    "Enabled": false
                                },
                                "OriginAccessControlId": "E2CJRMB5LKEABC"
                            }
                        ]
                    },
                    "OriginGroups": {
                        "Quantity": 0
                    },
                    "DefaultCacheBehavior": {
                        "TargetOriginId": "example-cfn-simple-distribution123",
                        "TrustedKeyGroups": {
                            "Enabled": false,
                            "Quantity": 0
                        },
                        "ViewerProtocolPolicy": "allow-all",
                        "AllowedMethods": {
                            "Quantity": 2,
                            "Items": [
                                "HEAD",
                                "GET"
                            ],
                            "CachedMethods": {
                                "Quantity": 2,
                                "Items": [
                                    "HEAD",
                                    "GET"
                                ]
                            }
                        },
                        "Compress": true,
                        "LambdaFunctionAssociations": {
                            "Quantity": 0
                        },
                        "FunctionAssociations": {
                            "Quantity": 0
                        },
                        "FieldLevelEncryptionId": "",
                        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e5abc",
                        "GrpcConfig": {
                            "Enabled": false
                        }
                    },
                    "CacheBehaviors": {
                        "Quantity": 0
                    },
                    "CustomErrorResponses": {
                        "Quantity": 0
                    },
                    "Comment": "",
                    "PriceClass": "PriceClass_All",
                    "Enabled": true,
                    "ViewerCertificate": {
                        "CloudFrontDefaultCertificate": false,
                        "ACMCertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/ec53f564-ea5a-4e4a-a0a2-e3c989449abc",
                        "SSLSupportMethod": "sni-only",
                        "MinimumProtocolVersion": "TLSv1.2_2021",
                        "Certificate": "arn:aws:acm:us-east-1:123456789012:certificate/ec53f564-ea5a-4e4a-a0a2-e3c989449abc",
                        "CertificateSource": "acm"
                    },
                    "Restrictions": {
                        "GeoRestriction": {
                            "RestrictionType": "none",
                            "Quantity": 0
                        }
                    },
                    "WebACLId": "arn:aws:wafv2:us-east-1:123456789012:global/webacl/web-global-example/626900da-5f64-418b-ba9b-743f3746cabc",
                    "HttpVersion": "http2",
                    "IsIPV6Enabled": false,
                    "Staging": false,
                    "ConnectionMode": "tenant-only"
                }
            ]
        }
    }

For more information, see `Create custom connection group (optional) <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-connection-group.html>`__ in the *Amazon CloudFront Developer Guide*.
