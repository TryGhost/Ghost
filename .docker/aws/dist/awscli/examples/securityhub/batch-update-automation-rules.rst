**To update automation rules**

The following ``batch-update-automation-rules`` example updates the specified automation rule. You can update one or more rules with a single command. Only the Security Hub administrator account can run this command. ::

    aws securityhub batch-update-automation-rules \
        --update-automation-rules-request-items '[ \
            { \
                "Actions": [{ \
                    "Type": "FINDING_FIELDS_UPDATE", \
                    "FindingFieldsUpdate": { \
                        "Note": { \
                            "Text": "Known issue that is a risk", \
                            "UpdatedBy": "sechub-automation" \
                        }, \
                        "Workflow": { \
                            "Status": "NEW" \
                        } \
                    } \
                }], \
                "Criteria": { \
                    "SeverityLabel": [{ \
                        "Value": "LOW", \
                        "Comparison": "EQUALS" \
                    }] \
                }, \
                "RuleArn": "arn:aws:securityhub:us-east-1:123456789012:automation-rule/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111", \
                "RuleOrder": 1, \
                "RuleStatus": "DISABLED" \
            } \
        ]'

Output::

    {
        "ProcessedAutomationRules": [
            "arn:aws:securityhub:us-east-1:123456789012:automation-rule/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
        ],
        "UnprocessedAutomationRules": []
    }

For more information, see `Editing automation rules <https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html#edit-automation-rules>`__ in the *AWS Security Hub User Guide*.