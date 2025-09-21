**Example 1: To update a CloudFront distribution's default root object**

The following example updates the default root object to ``index.html`` for the CloudFront distribution with the ID ``EDFDVBD6EXAMPLE``. ::

    aws cloudfront update-distribution \
        --id EDFDVBD6EXAMPLE \
        --default-root-object index.html

Output::

    {
        "ETag": "E2QWRUHEXAMPLE",
        "Distribution": {
            "Id": "EDFDVBD6EXAMPLE",
            "ARN": "arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE",
            "Status": "InProgress",
            "LastModifiedTime": "2019-12-06T18:55:39.870Z",
            "InProgressInvalidationBatches": 0,
            "DomainName": "d111111abcdef8.cloudfront.net",
            "ActiveTrustedSigners": {
                "Enabled": false,
                "Quantity": 0
            },
            "DistributionConfig": {
                "CallerReference": "6b10378d-49be-4c4b-a642-419ccaf8f3b5",
                "Aliases": {
                    "Quantity": 0
                },
                "DefaultRootObject": "index.html",
                "Origins": {
                    "Quantity": 1,
                    "Items": [
                        {
                            "Id": "example-website",
                            "DomainName": "www.example.com",
                            "OriginPath": "",
                            "CustomHeaders": {
                                "Quantity": 0
                            },
                            "CustomOriginConfig": {
                                "HTTPPort": 80,
                                "HTTPSPort": 443,
                                "OriginProtocolPolicy": "match-viewer",
                                "OriginSslProtocols": {
                                    "Quantity": 2,
                                    "Items": [
                                        "SSLv3",
                                        "TLSv1"
                                    ]
                                },
                                "OriginReadTimeout": 30,
                                "OriginKeepaliveTimeout": 5
                            }
                        }
                    ]
                },
                "OriginGroups": {
                    "Quantity": 0
                },
                "DefaultCacheBehavior": {
                    "TargetOriginId": "example-website",
                    "ForwardedValues": {
                        "QueryString": false,
                        "Cookies": {
                            "Forward": "none"
                        },
                        "Headers": {
                            "Quantity": 1,
                            "Items": [
                                "*"
                            ]
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
                "HttpVersion": "http1.1",
                "IsIPV6Enabled": true
            }
        }
    }

**Example 2: To update a CloudFront distribution**

The following example disables the CloudFront distribution with the ID ``EMLARXS9EXAMPLE`` by providing the distribution configuration in a JSON file named ``dist-config-disable.json``. To update a distribution, you must use the ``--if-match`` option to provide the distribution's ``ETag``. To get the
``ETag``, use the `get-distribution <get-distribution.html>`_ or `get-distribution-config <get-distribution-config.html>`_ command. Note that the ``Enabled`` field is set to
``false`` in the JSON file.

After you use the following example to disable a distribution, you can use the `delete-distribution <delete-distribution.html>`_ command to delete it. ::

    aws cloudfront update-distribution \
        --id EMLARXS9EXAMPLE \
        --if-match E2QWRUHEXAMPLE \
        --distribution-config file://dist-config-disable.json

Contents of ``dist-config-disable.json``::

    {
        "CallerReference": "cli-1574382155-496510",
        "Aliases": {
            "Quantity": 0
        },
        "DefaultRootObject": "index.html",
        "Origins": {
            "Quantity": 1,
            "Items": [
                {
                    "Id": "amzn-s3-demo-bucket.s3.amazonaws.com-1574382155-273939",
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
            "TargetOriginId": "amzn-s3-demo-bucket.s3.amazonaws.com-1574382155-273939",
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
        "Enabled": false,
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

Output::

    {
        "ETag": "E9LHASXEXAMPLE",
        "Distribution": {
            "Id": "EMLARXS9EXAMPLE",
            "ARN": "arn:aws:cloudfront::123456789012:distribution/EMLARXS9EXAMPLE",
            "Status": "InProgress",
            "LastModifiedTime": "2019-12-06T18:32:35.553Z",
            "InProgressInvalidationBatches": 0,
            "DomainName": "d111111abcdef8.cloudfront.net",
            "ActiveTrustedSigners": {
                "Enabled": false,
                "Quantity": 0
            },
            "DistributionConfig": {
                "CallerReference": "cli-1574382155-496510",
                "Aliases": {
                    "Quantity": 0
                },
                "DefaultRootObject": "index.html",
                "Origins": {
                    "Quantity": 1,
                    "Items": [
                        {
                            "Id": "amzn-s3-demo-bucket.s3.amazonaws.com-1574382155-273939",
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
                    "TargetOriginId": "amzn-s3-demo-bucket.s3.amazonaws.com-1574382155-273939",
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
                "Enabled": false,
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
