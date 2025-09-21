**To list CloudFront distributions**

The following example gets a list of the CloudFront distributions in your AWS account. ::

    aws cloudfront list-distributions

Output::

    {
        "DistributionList": {
            "Items": [
                {
                    "Id": "E23YS8OEXAMPLE",
                    "ARN": "arn:aws:cloudfront::123456789012:distribution/E23YS8OEXAMPLE",
                    "Status": "Deployed",
                    "LastModifiedTime": "2024-08-05T18:23:40.375000+00:00",
                    "DomainName": "abcdefgh12ijk.cloudfront.net",
                    "Aliases": {
                        "Quantity": 0
                    },
                    "Origins": {
                        "Quantity": 1,
                        "Items": [
                            {
                                "Id": "amzn-s3-demo-bucket.s3.us-east-1.amazonaws.com",
                                "DomainName": "amzn-s3-demo-bucket.s3.us-east-1.amazonaws.com",
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
                                "OriginAccessControlId": "EIAP8PEXAMPLE"
                            }
                        ]
                    },
                    "OriginGroups": {
                        "Quantity": 0
                    },
                    "DefaultCacheBehavior": {
                        "TargetOriginId": "amzn-s3-demo-bucket.s3.us-east-1.amazonaws.com",
                        "TrustedSigners": {
                            "Enabled": false,
                            "Quantity": 0
                        },
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
                        "SmoothStreaming": false,
                        "Compress": true,
                        "LambdaFunctionAssociations": {
                            "Quantity": 0
                        },
                        "FunctionAssociations": {
                            "Quantity": 0
                        },
                        "FieldLevelEncryptionId": "",
                        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e886EXAMPLE"
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
                        "CloudFrontDefaultCertificate": true,
                        "SSLSupportMethod": "vip",
                        "MinimumProtocolVersion": "TLSv1",
                        "CertificateSource": "cloudfront"
                    },
                    "Restrictions": {
                        "GeoRestriction": {
                            "RestrictionType": "none",
                            "Quantity": 0
                        }
                    },
                    "WebACLId": "",
                    "HttpVersion": "HTTP2",
                    "IsIPV6Enabled": true,
                    "Staging": false
                }
            ]
        }
    }
