**To retrieve a specific custom rule group**

The following ``get-rule-group`` retrieves the custom rule group with the specified name, scope, and ID. You can get the ID for a rule group from the commands ``create-rule-group`` and ``list-rule-groups``. ::

    aws wafv2 get-rule-group \
        --name ff \
        --scope REGIONAL \
        --id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "RuleGroup":{
            "Capacity":1,
            "Description":"",
            "Rules":[
                {
                    "Priority":0,
                    "Action":{
                        "Block":{

                        } 
                    },
                    "VisibilityConfig":{
                        "SampledRequestsEnabled":true,
                        "CloudWatchMetricsEnabled":true,
                        "MetricName":"jj"
                    },
                    "Name":"jj",
                    "Statement":{
                        "SizeConstraintStatement":{
                            "ComparisonOperator":"LE",
                            "TextTransformations":[
                                {
                                    "Priority":0,
                                    "Type":"NONE"
                                }
                            ],
                            "FieldToMatch":{
                                "UriPath":{

                                }
                            },
                            "Size":7
                        }
                    }
                }
            ],
            "VisibilityConfig":{
                "SampledRequestsEnabled":true,
                "CloudWatchMetricsEnabled":true,
                "MetricName":"ff"
            },
            "Id":"a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "ARN":"arn:aws:wafv2:us-west-2:123456789012:regional/rulegroup/ff/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "Name":"ff"
        },
        "LockToken":"485458c9-1830-4234-af31-ec4d52ced1b3"
    }

For more information, see `Managing Your Own Rule Groups <https://docs.aws.amazon.com/waf/latest/developerguide/waf-user-created-rule-groups.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
