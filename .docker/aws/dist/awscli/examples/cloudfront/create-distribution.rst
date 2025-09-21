**Example 1: To create a CloudFront distribution**

The following ``create-distribution`` example creates a distribution for an S3 bucket named ``amzn-s3-demo-bucket``, and also specifies ``index.html`` as the default root object, using command line arguments. ::

    aws cloudfront create-distribution \
        --origin-domain-name amzn-s3-demo-bucket.s3.amazonaws.com \
        --default-root-object index.html

Output::

    {
        "Location": "https://cloudfront.amazonaws.com/2019-03-26/distribution/EMLARXS9EXAMPLE",
        "ETag": "E9LHASXEXAMPLE",
        "Distribution": {
            "Id": "EMLARXS9EXAMPLE",
            "ARN": "arn:aws:cloudfront::123456789012:distribution/EMLARXS9EXAMPLE",
            "Status": "InProgress",
            "LastModifiedTime": "2019-11-22T00:55:15.705Z",
            "InProgressInvalidationBatches": 0,
            "DomainName": "d111111abcdef8.cloudfront.net",
            "ActiveTrustedSigners": {
                "Enabled": false,
                "Quantity": 0
            },
            "DistributionConfig": {
                "CallerReference": "cli-example",
                "Aliases": {
                    "Quantity": 0
                },
                "DefaultRootObject": "index.html",
                "Origins": {
                    "Quantity": 1,
                    "Items": [
                        {
                            "Id": "amzn-s3-demo-bucket.s3.amazonaws.com-cli-example",
                            "DomainName": "amzn-s3-demo-bucket.s3.amazonaws.com",
                            "OriginPath": "",
                            "CustomHeaders": {
                                "Quantity": 0
                            },
                            "S3OriginConfig": {
                                "OriginAccessIdentity": ""
                            }
                        }
                    ]
                },
                "OriginGroups": {
                    "Quantity": 0
                },
                "DefaultCacheBehavior": {
                    "TargetOriginId": "amzn-s3-demo-bucket.s3.amazonaws.com-cli-example",
                    "ForwardedValues": {
                        "QueryString": false,
                        "Cookies": {
                            "Forward": "none"
                        },
                        "Headers": {
                            "Quantity": 0
                        },
                        "QueryStringCacheKeys": {
                            "Quantity": 0
                        }
                    },
                    "TrustedSigners": {
                        "Enabled": false,
                        "Quantity": 0
                    },
                    "ViewerProtocolPolicy": "allow-all",
                    "MinTTL": 0,
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
                    "DefaultTTL": 86400,
                    "MaxTTL": 31536000,
                    "Compress": false,
                    "LambdaFunctionAssociations": {
                        "Quantity": 0
                    },
                    "FieldLevelEncryptionId": ""
                },
                "CacheBehaviors": {
                    "Quantity": 0
                },
                "CustomErrorResponses": {
                    "Quantity": 0
                },
                "Comment": "",
                "Logging": {
                    "Enabled": false,
                    "IncludeCookies": false,
                    "Bucket": "",
                    "Prefix": ""
                },
                "PriceClass": "PriceClass_All",
                "Enabled": true,
                "ViewerCertificate": {
                    "CloudFrontDefaultCertificate": true,
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
                "HttpVersion": "http2",
                "IsIPV6Enabled": true
            }
        }
    }

**Example 2: To create a CloudFront distribution using a JSON file**

The following ``create-distribution`` example creates a distribution for an S3 bucket named ``amzn-s3-demo-bucket``, and also specifies ``index.html`` as the default root object, using a JSON file. ::

    aws cloudfront create-distribution \
        --distribution-config file://dist-config.json


Contents of ``dist-config.json``::

    {
        "CallerReference": "cli-example",
        "Aliases": {
            "Quantity": 0
        },
        "DefaultRootObject": "index.html",
        "Origins": {
            "Quantity": 1,
            "Items": [
                {
                    "Id": "amzn-s3-demo-bucket.s3.amazonaws.com-cli-example",
                    "DomainName": "amzn-s3-demo-bucket.s3.amazonaws.com",
                    "OriginPath": "",
                    "CustomHeaders": {
                        "Quantity": 0
                    },
                    "S3OriginConfig": {
                        "OriginAccessIdentity": ""
                    }
                }
            ]
        },
        "OriginGroups": {
            "Quantity": 0
        },
        "DefaultCacheBehavior": {
            "TargetOriginId": "amzn-s3-demo-bucket.s3.amazonaws.com-cli-example",
            "ForwardedValues": {
                "QueryString": false,
                "Cookies": {
                    "Forward": "none"
                },
                "Headers": {
                    "Quantity": 0
                },
                "QueryStringCacheKeys": {
                    "Quantity": 0
                }
            },
            "TrustedSigners": {
                "Enabled": false,
                "Quantity": 0
            },
            "ViewerProtocolPolicy": "allow-all",
            "MinTTL": 0,
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
            "DefaultTTL": 86400,
            "MaxTTL": 31536000,
            "Compress": false,
            "LambdaFunctionAssociations": {
                "Quantity": 0
            },
            "FieldLevelEncryptionId": ""
        },
        "CacheBehaviors": {
            "Quantity": 0
        },
        "CustomErrorResponses": {
            "Quantity": 0
        },
        "Comment": "",
        "Logging": {
            "Enabled": false,
            "IncludeCookies": false,
            "Bucket": "",
            "Prefix": ""
        },
        "PriceClass": "PriceClass_All",
        "Enabled": true,
        "ViewerCertificate": {
            "CloudFrontDefaultCertificate": true,
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
        "HttpVersion": "http2",
        "IsIPV6Enabled": true
    }

See Example 1 for sample output.

**Example 3: To create a CloudFront multi-tenant distribution with a certificate**

The following ``create-distribution`` example creates a CloudFront distribution with multi-tenant support and a specifies a TLS certificate. ::

    aws cloudfront create-distribution \
        --distribution-config file://dist-config.json

Contents of ``dist-config.json``::

    {
        "CallerReference": "cli-example-with-cert",
        "Comment": "CLI example distribution",
        "DefaultRootObject": "index.html",
        "Origins": {
            "Quantity": 1,
            "Items": [
                {
                    "Id": "amzn-s3-demo-bucket.s3.us-east-1.amazonaws.com",
                    "DomainName": "amzn-s3-demo-bucket.s3.us-east-1.amazonaws.com",
                    "OriginPath": "/{{tenantName}}",
                    "CustomHeaders": {
                        "Quantity": 0
                    },
                    "S3OriginConfig": {
                        "OriginAccessIdentity": ""
                    }
                }
            ]
        },
        "DefaultCacheBehavior": {
            "TargetOriginId": "amzn-s3-demo-bucket.s3.us-east-1.amazonaws.com",
            "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e5ABC",
            "ViewerProtocolPolicy": "allow-all",
            "AllowedMethods": {
                "Quantity": 2,
                "Items": ["HEAD", "GET"],
                "CachedMethods": {
                    "Quantity": 2,
                    "Items": ["HEAD", "GET"]
                }
            }
        },
        "Enabled": true,
        "ViewerCertificate": {
            "ACMCertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/191306a1-db01-49ca-90ef-fc414ee5dabc",
            "SSLSupportMethod": "sni-only"
        },
        "HttpVersion": "http2",
        "ConnectionMode": "tenant-only",
        "TenantConfig": {
            "ParameterDefinitions": [
                {
                    "Name": "tenantName",
                    "Definition": {
                        "StringSchema": {
                            "Comment": "tenantName parameter",
                            "DefaultValue": "root",
                            "Required": false
                        }
                    }
                }
            ]
        }
    }

Output::

    {
        "Location": "https://cloudfront.amazonaws.com/2020-05-31/distribution/E1HVIAU7UABC",
        "ETag": "E20LT7R1BABC",
        "Distribution": {
            "Id": "E1HVIAU7U12ABC",
            "ARN": "arn:aws:cloudfront::123456789012:distribution/E1HVIAU7U12ABC",
            "Status": "InProgress",
            "LastModifiedTime": "2025-07-10T20:33:31.117000+00:00",
            "InProgressInvalidationBatches": 0,
            "DomainName": "example.com",
            "ActiveTrustedSigners": {
                "Enabled": false,
                "Quantity": 0
            },
            "ActiveTrustedKeyGroups": {
                "Enabled": false,
                "Quantity": 0
            },
            "DistributionConfig": {
                "CallerReference": "cli-example-with-cert",
                "DefaultRootObject": "index.html",
                "Origins": {
                    "Quantity": 1,
                    "Items": [
                        {
                            "Id": "amzn-s3-demo-bucket.s3.us-east-1.amazonaws.com",
                            "DomainName": "amzn-s3-demo-bucket.s3.us-east-1.amazonaws.com",
                            "OriginPath": "/{{tenantName}}",
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
                            "OriginAccessControlId": ""
                        }
                    ]
                },
                "OriginGroups": {
                    "Quantity": 0
                },
                "DefaultCacheBehavior": {
                    "TargetOriginId": "amzn-s3-demo-bucket.s3.us-east-1.amazonaws.com",
                    "TrustedKeyGroups": {
                        "Enabled": false,
                        "Quantity": 0
                    },
                    "ViewerProtocolPolicy": "allow-all",
                    "AllowedMethods": {
                        "Quantity": 2,
                        "Items": ["HEAD", "GET"],
                        "CachedMethods": {
                            "Quantity": 2,
                            "Items": ["HEAD", "GET"]
                        }
                    },
                    "Compress": false,
                    "LambdaFunctionAssociations": {
                        "Quantity": 0
                    },
                    "FunctionAssociations": {
                        "Quantity": 0
                    },
                    "FieldLevelEncryptionId": "",
                    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e5ABC",
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
                "Comment": "CLI example distribution",
                "Logging": {
                    "Enabled": false,
                    "IncludeCookies": false,
                    "Bucket": "",
                    "Prefix": ""
                },
                "Enabled": true,
                "ViewerCertificate": {
                    "CloudFrontDefaultCertificate": false,
                    "ACMCertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/1954f095-11b6-4daf-9952-0c308a00abc",
                    "SSLSupportMethod": "sni-only",
                    "MinimumProtocolVersion": "TLSv1.2_2021",
                    "Certificate": "arn:aws:acm:us-east-1:123456789012:certificate/1954f095-11b6-4daf-9952-0c308a00abc",
                    "CertificateSource": "acm"
                },
                "Restrictions": {
                    "GeoRestriction": {
                        "RestrictionType": "none",
                        "Quantity": 0
                    }
                },
                "WebACLId": "",
                "HttpVersion": "http2",
                "TenantConfig": {
                    "ParameterDefinitions": [
                        {
                            "Name": "tenantName",
                            "Definition": {
                                "StringSchema": {
                                    "Comment": "tenantName parameter",
                                    "DefaultValue": "root",
                                    "Required": false
                                }
                            }
                        }
                    ]
                },
                "ConnectionMode": "tenant-only"
            }
        }
    }

For more information, see `Working with distributions <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-working-with.html>`__ in the *Amazon CloudFront Developer Guide*.

**Example 4: To create a CloudFront multi-tenant distribution without a certificate**

The following ``create-distribution`` example creates a CloudFront distribution with multi-tenant support but without a TLS certificate. ::

    aws cloudfront create-distribution \
        --distribution-config file://dist-config.json

Contents of ``dist-config.json``::

    {
        "CallerReference": "cli-example",
        "Comment": "CLI example distribution",
        "DefaultRootObject": "index.html",
        "Origins": {
            "Quantity": 1,
            "Items": [
                {
                    "Id": "amzn-s3-demo-bucket.s3.us-east-1.amazonaws.com",
                    "DomainName": "amzn-s3-demo-bucket.s3.us-east-1.amazonaws.com",
                    "OriginPath": "/{{tenantName}}",
                    "CustomHeaders": {
                        "Quantity": 0
                    },
                    "S3OriginConfig": {
                        "OriginAccessIdentity": ""
                    }
                }
            ]
        },
        "DefaultCacheBehavior": {
            "TargetOriginId": "amzn-s3-demo-bucket.s3.us-east-1.amazonaws.com",
            "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e5ABC",
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
            }
        },
        "Enabled": true,
        "HttpVersion": "http2",
        "ConnectionMode": "tenant-only",
        "TenantConfig": {
            "ParameterDefinitions": [
                {
                    "Name": "tenantName",
                    "Definition": {
                        "StringSchema": {
                            "Comment": "tenantName parameter",
                            "DefaultValue": "root",
                            "Required": false
                        }
                    }
                }
            ]
        }
    }

Output::

    {
        "Location": "https://cloudfront.amazonaws.com/2020-05-31/distribution/E2GJ5J9QN12ABC",
        "ETag": "E37YLVVQIABC",
        "Distribution": {
            "Id": "E2GJ5J9QNABC",
            "ARN": "arn:aws:cloudfront::123456789012:distribution/E2GJ5J9QN12ABC",
            "Status": "InProgress",
            "LastModifiedTime": "2025-07-10T20:35:20.565000+00:00",
            "InProgressInvalidationBatches": 0,
            "DomainName": "example.com",
            "ActiveTrustedSigners": {
                "Enabled": false,
                "Quantity": 0
            },
            "ActiveTrustedKeyGroups": {
                "Enabled": false,
                "Quantity": 0
            },
            "DistributionConfig": {
                "CallerReference": "cli-example-no-cert",
                "DefaultRootObject": "index.html",
                "Origins": {
                    "Quantity": 1,
                    "Items": [
                        {
                            "Id": "amzn-s3-demo-bucket.s3.us-east-1.amazonaws.com",
                            "DomainName": "amzn-s3-demo-bucket.s3.us-east-1.amazonaws.com",
                            "OriginPath": "/{{tenantName}}",
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
                            "OriginAccessControlId": ""
                        }
                    ]
                },
                "OriginGroups": {
                    "Quantity": 0
                },
                "DefaultCacheBehavior": {
                    "TargetOriginId": "amzn-s3-demo-bucket.s3.us-east-1.amazonaws.com",
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
                    "Compress": false,
                    "LambdaFunctionAssociations": {
                        "Quantity": 0
                    },
                    "FunctionAssociations": {
                        "Quantity": 0
                    },
                    "FieldLevelEncryptionId": "",
                    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e5ABC",
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
                "Comment": "CLI example distribution",
                "Logging": {
                    "Enabled": false,
                    "IncludeCookies": false,
                    "Bucket": "",
                    "Prefix": ""
                },
                "Enabled": true,
                "ViewerCertificate": {
                    "CloudFrontDefaultCertificate": true,
                    "SSLSupportMethod": "sni-only",
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
                "HttpVersion": "http2",
                "TenantConfig": {
                    "ParameterDefinitions": [
                        {
                            "Name": "tenantName",
                            "Definition": {
                                "StringSchema": {
                                    "Comment": "tenantName parameter",
                                    "DefaultValue": "root",
                                    "Required": false
                                }
                            }
                        }
                    ]
                },
                "ConnectionMode": "tenant-only"
            }
        }
    }

For more information, see `Configure distributions <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-working-with.html>`__ in the *Amazon CloudFront Developer Guide*.