**To delete automation rules**

The following ``batch-delete-automation-rules`` example deletes the specified automation rule. You can delete one or more rules with a single command. Only the Security Hub administrator account can run this command. ::

    aws securityhub batch-delete-automation-rules \
        --automation-rules-arns '["arn:aws:securityhub:us-east-1:123456789012:automation-rule/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"]'


Output::

    {
        "ProcessedAutomationRules": [
            "arn:aws:securityhub:us-east-1:123456789012:automation-rule/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
        ],
        "UnprocessedAutomationRules": []
    }

For more information, see `Deleting automation rules <https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html#delete-automation-rules>`__ in the *AWS Security Hub User Guide*.