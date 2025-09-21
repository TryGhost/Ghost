**To retrieve the web ACL that's associated with an AWS resource**

The following ``get-web-acl-for-resource`` retrieves the JSON for the web ACL that's associated with the specified resource. ::

    aws wafv2 get-web-acl-for-resource \
        --resource-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/waf-cli-alb/1ea17125f8b25a2a

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
            "Id":"9a1b2c3d4-5678-90ab-cdef-EXAMPLE11111  ",
            "ARN":"arn:aws:wafv2:us-west-2:123456789012:regional/webacl/test01/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111  ",
            "Name":"test01"
        }
    } 

For more information, see `Associating or Disassociating a Web ACL with an AWS Resource <https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-associating-aws-resource.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
