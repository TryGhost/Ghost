**To create a web ACL**

The following ``create-web-acl`` command creates a web ACL for regional use. The rule statements for the web ACL are provided in a JSON-formatted file. ::

    aws wafv2 create-web-acl \
        --name TestWebAcl \
        --scope REGIONAL \
        --default-action Allow={} \
        --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=TestWebAclMetrics \
        --rules file://waf-rule.json \
        --region us-west-2

Contents of `file://waf-rule.json`::

    [
        {
            "Name":"basic-rule",
            "Priority":0,
            "Statement":{
                "AndStatement":{
                    "Statements":[
                        {
                            "ByteMatchStatement":{
                                "SearchString":"example.com",
                                "FieldToMatch":{
                                    "SingleHeader":{
                                        "Name":"host"
                                    }
                                },
                                "TextTransformations":[
                                    {
                                        "Priority":0,
                                        "Type":"LOWERCASE"
                                    }
                                ],
                                "PositionalConstraint":"EXACTLY"
                            }
                        },
                        {
                            "GeoMatchStatement":{
                                "CountryCodes":[
                                    "US",
                                    "IN"
                                ]
                            }
                        }
                    ]
                }
            },
            "Action":{
                "Allow":{

                }
            },
            "VisibilityConfig":{
                "SampledRequestsEnabled":true,
                "CloudWatchMetricsEnabled":true,
                "MetricName":"basic-rule"
            }
        }
    ]

Output::

    {
        "Summary":{
            "ARN":"arn:aws:wafv2:us-west-2:123456789012:regional/webacl/TestWebAcl/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "Description":"",
            "Name":"TestWebAcl",
            "LockToken":"2294b3a1-eb60-4aa0-a86f-a3ae04329de9",
            "Id":"a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
        }
    } 

For more information, see `Managing and Using a Web Access Control List (Web ACL) <https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
