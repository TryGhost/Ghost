**To retrieve a list of notification rule targets**

The following ``list-targets`` example retrieves a list of all notification rule targets in the specified AWS Region. ::

    aws codestar-notifications list-targets \
        --region us-east-1

Output::

    {
        "Targets": [
            {
                "TargetAddress": "arn:aws:sns:us-east-1:123456789012:MySNSTopicForNotificationRules",
                "TargetType": "SNS",
                "TargetStatus": "ACTIVE"
            },
            {
                "TargetAddress": "arn:aws:sns:us-east-1:123456789012:MySNSTopicForNotificationsAboutMyDemoRepo",
                "TargetType": "SNS",
                "TargetStatus": "ACTIVE"
            }
        ]
    }

For more information, see `View Notification Rule Targets <https://docs.aws.amazon.com/codestar-notifications/latest/userguide/notification-target-view.html>`__ in the *AWS Developer Tools Console User Guide*.
