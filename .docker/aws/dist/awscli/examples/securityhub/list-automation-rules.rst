**To view a list of automation rules**

The following ``list-automation-rules`` example lists the automation rules for an AWS account. Only the Security Hub administrator account can run this command. ::

    aws securityhub list-automation-rules \
        --max-results 3 \
        --next-token NULL

Output::

    {
        "AutomationRulesMetadata": [
            {
                "RuleArn": "arn:aws:securityhub:us-east-1:123456789012:automation-rule/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "RuleStatus": "ENABLED",
                "RuleOrder": 1,
                "RuleName": "Suppress informational findings",
                "Description": "Suppress GuardDuty findings with Informational severity",
                "IsTerminal": false,
                "CreatedAt": "2023-05-31T17:56:14.837000+00:00",
                "UpdatedAt": "2023-05-31T17:59:38.466000+00:00",
                "CreatedBy": "arn:aws:iam::123456789012:role/Admin"
            },
            {
                "RuleArn": "arn:aws:securityhub:us-east-1:123456789012:automation-rule/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "RuleStatus": "ENABLED",
                "RuleOrder": 1,
                "RuleName": "sample rule",
                "Description": "A sample rule",
                "IsTerminal": false,
                "CreatedAt": "2023-07-15T23:37:20.223000+00:00",
                "UpdatedAt": "2023-07-15T23:37:20.223000+00:00",
                "CreatedBy": "arn:aws:iam::123456789012:role/Admin"
            },
            {
                "RuleArn": "arn:aws:securityhub:us-east-1:123456789012:automation-rule/a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "RuleStatus": "ENABLED",
                "RuleOrder": 1,
                "RuleName": "sample rule",
                "Description": "A sample rule",
                "IsTerminal": false,
                "CreatedAt": "2023-07-15T23:45:25.126000+00:00",
                "UpdatedAt": "2023-07-15T23:45:25.126000+00:00",
                "CreatedBy": "arn:aws:iam::123456789012:role/Admin"
            }
        ]
    }

For more information, see `Viewing automation rules <https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html#view-automation-rules>`__ in the *AWS Security Hub User Guide*.