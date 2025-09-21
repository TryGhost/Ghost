**To add a target to a notification rule**

The following ``subscribe`` example adds an Amazon SNS topic as a target for the specified notification rule. ::

    aws codestar-notifications subscribe \
        --arn arn:aws:codestar-notifications:us-east-1:123456789012:notificationrule/dc82df7a-EXAMPLE \
        --target TargetType=SNS,TargetAddress=arn:aws:sns:us-east-1:123456789012:MyNotificationTopic

Output::

    {
        "Arn": "arn:aws:codestar-notifications:us-east-1:123456789012:notificationrule/dc82df7a-EXAMPLE"
    }

For more information, see `Add or Remove an Amazon SNS Topic as a Target for a Notification Rule <https://docs.aws.amazon.com/codestar-notifications/latest/userguide/notification-target-change-rule.html>`__ in the *AWS Developer Tools Console User Guide*.
