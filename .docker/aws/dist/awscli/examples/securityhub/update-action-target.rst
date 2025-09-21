**To update a custom action**

The following ``update-action-target`` example updates the name of the custom action identified by the specified ARN. ::

    aws securityhub update-action-target \
        --action-target-arn "arn:aws:securityhub:us-west-1:123456789012:action/custom/Remediation" \
        --name "Send to remediation" 

This command produces no output.

For more information, see `Creating a custom action and associating it with a CloudWatch Events rule <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cloudwatch-events.html#securityhub-cwe-configure>`__ in the *AWS Security Hub User Guide*.
