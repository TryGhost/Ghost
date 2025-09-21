**To retrieve details about custom actions**

The following ``describe-action-targets`` example retrieves information about the custom action identified by the specified ARN. ::

    aws securityhub describe-action-targets \
        --action-target-arns "arn:aws:securityhub:us-west-1:123456789012:action/custom/Remediation"

Output::

    {
        "ActionTargets": [ 
            { 
                "ActionTargetArn": "arn:aws:securityhub:us-west-1:123456789012:action/custom/Remediation",
                "Description": "Action to send the finding for remediation tracking",
                "Name": "Send to remediation"
            }
        ]
    }

For more information, see `Creating a custom action and associating it with a CloudWatch Events rule <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cloudwatch-events.html#securityhub-cwe-configure>`__ in the *AWS Security Hub User Guide*.
