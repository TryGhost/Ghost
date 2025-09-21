**To retrieve the description for a managed rule group**

The following ``describe-managed-rule-group`` retrieves the description for an AWS managed rule group. ::

    aws wafv2 describe-managed-rule-group \
        --vendor-name AWS \
        --name AWSManagedRulesCommonRuleSet \
        --scope REGIONAL

Output::

    {
        "Capacity": 700,
        "Rules": [
            {
                "Name": "NoUserAgent_HEADER",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "UserAgent_BadBots_HEADER",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "SizeRestrictions_QUERYSTRING",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "SizeRestrictions_Cookie_HEADER",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "SizeRestrictions_BODY",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "SizeRestrictions_URIPATH",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "EC2MetaDataSSRF_BODY",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "EC2MetaDataSSRF_COOKIE",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "EC2MetaDataSSRF_URIPATH",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "EC2MetaDataSSRF_QUERYARGUMENTS",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "GenericLFI_QUERYARGUMENTS",
                "Action": {
                    "Block": {}
                }
            },
            {
                }
                "Name": "GenericLFI_URIPATH",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "GenericLFI_BODY",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "RestrictedExtensions_URIPATH",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "RestrictedExtensions_QUERYARGUMENTS",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "GenericRFI_QUERYARGUMENTS",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "GenericRFI_BODY",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "GenericRFI_URIPATH",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "CrossSiteScripting_COOKIE",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "CrossSiteScripting_QUERYARGUMENTS",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "CrossSiteScripting_BODY",
                "Action": {
                    "Block": {}
                }
            },
            {
                "Name": "CrossSiteScripting_URIPATH",
                "Action": {
                    "Block": {}
                }
            }
        ]
    }

For more information, see `Managed Rule Groups <https://docs.aws.amazon.com/waf/latest/developerguide/waf-managed-rule-groups.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
