**To delete a custom action**

The following ``delete-action-target`` example deletes the custom action identified by the specified ARN. ::

    aws securityhub delete-action-target \
        --action-target-arn "arn:aws:securityhub:us-west-1:123456789012:action/custom/Remediation"

Output::

    {
        "ActionTargetArn": "arn:aws:securityhub:us-west-1:123456789012:action/custom/Remediation"
    }

For more information, see `Creating a custom action and associating it with a CloudWatch Events rule <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cloudwatch-events.html#securityhub-cwe-configure>`__ in the *AWS Security Hub User Guide*.
