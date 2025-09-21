**To retrieve a web ACL**

The following ``get-web-acl`` retrieves the web ACL with the specified name, scope, and ID. You can get the ID for a web ACL from the commands ``create-web-acl`` and ``list-web-acls``. ::

    aws wafv2 get-web-acl \
        --name test01 \
        --scope REGIONAL \
        --id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 

Output::

    {
        "WebACL":{
            "Capacity":3,
            "Description":"",
            "Rules":[
                {
                    "Priority":1,
                    "Action":{
                        "Block":{

                        }
                    },
                    "VisibilityConfig":{
                       "SampledRequestsEnabled":true,
                        "CloudWatchMetricsEnabled":true,
                        "MetricName":"testrule01"
                    },
                    "Name":"testrule01",
                    "Statement":{
                        "AndStatement":{
                            "Statements":[
                                {
                                    "ByteMatchStatement":{
                                        "PositionalConstraint":"EXACTLY",
                                        "TextTransformations":[
                                            {
                                                "Priority":0,
                                                "Type":"NONE"
                                            }
                                        ],
                                        "SearchString":"dGVzdHN0cmluZw==",
                                        "FieldToMatch":{
                                            "UriPath":{

                                            }
                                        }
                                    }
                                },
                                {
                                    "SizeConstraintStatement":{
                                        "ComparisonOperator":"EQ",
                                        "TextTransformations":[
                                            {
                                                "Priority":0,
                                                "Type":"NONE"
                                            }
                                        ],
                                        "FieldToMatch":{
                                            "QueryString":{

                                            }
                                        },
                                        "Size":0
                                    }
                                }
                            ]
                        }
                    }
                }
            ],
            "VisibilityConfig":{
                "SampledRequestsEnabled":true,
                "CloudWatchMetricsEnabled":true,
                "MetricName":"test01"
            },
            "DefaultAction":{
                "Allow":{

                }
            },
            "Id":"a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "ARN":"arn:aws:wafv2:us-west-2:123456789012:regional/webacl/test01/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "Name":"test01"
        },
        "LockToken":"e3db7e2c-d58b-4ee6-8346-6aec5511c6fb"
    } 

For more information, see `Managing and Using a Web Access Control List (Web ACL) <https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
