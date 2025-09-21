**To create a custom rule group for use in your web ACLs**

The following ``create-rule-group`` command creates a custom rule group for regional use. The rule statements for the group are provided in a JSON-formatted file. ::

    aws wafv2 create-rule-group \
        --name "TestRuleGroup" \
        --scope REGIONAL \
        --capacity 250 \
        --rules file://waf-rule.json \
        --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=TestRuleGroupMetrics \
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
            "ARN":"arn:aws:wafv2:us-west-2:123456789012:regional/rulegroup/TestRuleGroup/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "Description":"",
            "Name":"TestRuleGroup",
            "LockToken":"7b3bcec2-374e-4c5a-b2b9-563bf47249f0",
            "Id":"a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
        }
    }

For more information, see `Managing Your Own Rule Groups <https://docs.aws.amazon.com/waf/latest/developerguide/waf-user-created-rule-groups.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
