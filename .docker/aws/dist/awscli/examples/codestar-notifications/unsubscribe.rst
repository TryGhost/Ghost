**To remove a target from a notification rule**

The following ``unsubscribe`` example removes an Amazon SNS topic as a target from the specified notification rule. ::

    aws codestar-notifications unsubscribe \
        --arn arn:aws:codestar-notifications:us-east-1:123456789012:notificationrule/dc82df7a-EXAMPLE \
        --target TargetType=SNS,TargetAddress=arn:aws:sns:us-east-1:123456789012:MyNotificationTopic

Output::

    {
        "Arn": "arn:aws:codestar-notifications:us-east-1:123456789012:notificationrule/dc82df7a-EXAMPLE"
        "TargetAddress": "arn:aws:sns:us-east-1:123456789012:MyNotificationTopic"
    }

For more information, see `Add or Remove an Amazon SNS Topic as a Target for a Notification Rule <https://docs.aws.amazon.com/codestar-notifications/latest/userguide/notification-target-change-rule.html>`__ in the *AWS Developer Tools Console User Guide*.
