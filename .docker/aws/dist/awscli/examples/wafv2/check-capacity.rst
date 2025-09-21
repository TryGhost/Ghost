**To obtain the capacity used by a set of rules**

The following ``check-capacity`` retrieves the capacity requirements for a rule set that contains a rate-based rule statement, and an AND rule statement that contains nested rules. ::

    aws wafv2 check-capacity \
        --scope REGIONAL \
        --rules file://waf-rule-list.json \
        --region us-west-2

Contents of `file://waf-rule-list.json`::

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
        },
        {
            "Name":"rate-rule",
            "Priority":1,
            "Statement":{
                "RateBasedStatement":{
                    "Limit":1000,
                    "AggregateKeyType":"IP"
                }
            },
            "Action":{
                "Block":{
    
                }
            },
            "VisibilityConfig":{
                "SampledRequestsEnabled":true,
                "CloudWatchMetricsEnabled":true,
                "MetricName":"rate-rule"
            }
        }
    ]

Output::

    { 
        "Capacity":15
    }

For more information, see `AWS WAF Web ACL Capacity Units (WCU) <https://docs.aws.amazon.com/waf/latest/developerguide/how-aws-waf-works.html#aws-waf-capacity-units>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
