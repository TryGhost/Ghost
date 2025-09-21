**To get status information for an AWS Config rule**

The following command returns the status information for an AWS Config rule named ``MyConfigRule``::

    aws configservice describe-config-rule-evaluation-status --config-rule-names MyConfigRule

Output::

    {
        "ConfigRulesEvaluationStatus": [
            {
                "ConfigRuleArn": "arn:aws:config:us-east-1:123456789012:config-rule/config-rule-abcdef",
                "FirstActivatedTime": 1450311703.844,
                "ConfigRuleId": "config-rule-abcdef",
                "LastSuccessfulInvocationTime": 1450314643.156,
                "ConfigRuleName": "MyConfigRule"
            }
        ]
    }