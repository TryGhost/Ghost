**To create an automation rule**

The following ``create-automation-rule`` example creates an automation rule in the current AWS account and AWS Region. Security Hub filters your findings based on the specified criteria and applies the actions to matching findings. Only the Security Hub administrator account can run this command. ::

    aws securityhub create-automation-rule \
        --actions '[{ \
            "Type": "FINDING_FIELDS_UPDATE", \
            "FindingFieldsUpdate": { \
                "Severity": { \
                    "Label": "HIGH" \
                }, \
                "Note": { \
                    "Text": "Known issue that is a risk. Updated by automation rules", \
                    "UpdatedBy": "sechub-automation" \
                } \
            } \
        }]' \
        --criteria '{ \
            "SeverityLabel": [{ \
                "Value": "INFORMATIONAL", \
                "Comparison": "EQUALS" \
            }] \
        }' \
        --description "A sample rule" \
        --no-is-terminal \
        --rule-name "sample rule" \
        --rule-order 1 \
        --rule-status "ENABLED"

Output::

    {
        "RuleArn": "arn:aws:securityhub:us-east-1:123456789012:automation-rule/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
    }

For more information, see `Creating automation rules <https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html#create-automation-rules>`__ in the *AWS Security Hub User Guide*.