**To create a custom action**

The following ``create-action-target`` example creates a custom action. It provides the name, description, and identifier for the action. ::

    aws securityhub create-action-target \
        --name "Send to remediation" \
        --description "Action to send the finding for remediation tracking" \
        --id "Remediation"

Output::

    {
        "ActionTargetArn": "arn:aws:securityhub:us-west-1:123456789012:action/custom/Remediation"
    }

For more information, see `Creating a custom action and associating it with a CloudWatch Events rule <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cloudwatch-events.html#securityhub-cwe-configure>`__ in the *AWS Security Hub User Guide*.
