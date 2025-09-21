**To get details for automation rules**

The following ``batch-get-automation-rules`` example gets details for the specified automation rule. You can get details for one or more automation rules with a single command. ::

    aws securityhub batch-get-automation-rules \
        --automation-rules-arns '["arn:aws:securityhub:us-east-1:123456789012:automation-rule/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"]'

Output::

    {
        "Rules": [
            {
                "RuleArn": "arn:aws:securityhub:us-east-1:123456789012:automation-rule/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "RuleStatus": "ENABLED",
                "RuleOrder": 1,
                "RuleName": "Suppress informational findings",
                "Description": "Suppress GuardDuty findings with Informational severity",
                "IsTerminal": false,
                "Criteria": {
                    "ProductName": [
                        {
                            "Value": "GuardDuty",
                            "Comparison": "EQUALS"
                        }
                    ],
                    "SeverityLabel": [
                        {
                            "Value": "INFORMATIONAL",
                            "Comparison": "EQUALS"
                        }
                    ],
                    "WorkflowStatus": [
                        {
                            "Value": "NEW",
                            "Comparison": "EQUALS"
                        }
                    ],
                    "RecordState": [
                        {
                            "Value": "ACTIVE",
                            "Comparison": "EQUALS"
                        }
                    ]
                },
                "Actions": [
                    {
                        "Type": "FINDING_FIELDS_UPDATE",
                        "FindingFieldsUpdate": {
                            "Note": {
                                "Text": "Automatically suppress GuardDuty findings with Informational severity",
                                "UpdatedBy": "sechub-automation"
                            },
                            "Workflow": {
                                "Status": "SUPPRESSED"
                            }
                        }
                    }
                ],
                "CreatedAt": "2023-05-31T17:56:14.837000+00:00",
                "UpdatedAt": "2023-05-31T17:59:38.466000+00:00",
                "CreatedBy": "arn:aws:iam::123456789012:role/Admin"
            }
        ],
        "UnprocessedAutomationRules": []
    }

For more information, see `Viewing automation rules <https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html#view-automation-rules>`__ in the *AWS Security Hub User Guide*.