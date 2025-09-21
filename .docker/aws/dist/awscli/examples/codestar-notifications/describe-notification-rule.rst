**To retrieve details of a notification rule**

The following ``describe-notification-rule`` example retrieves the details of the specified notification rule. ::

    aws codestar-notifications describe-notification-rule \
        --arn arn:aws:codestar-notifications:us-west-2:123456789012:notificationrule/dc82df7a-EXAMPLE

Output::

    {
        "LastModifiedTimestamp": 1569199844.857,
        "EventTypes": [
            {
                "ServiceName": "CodeCommit",
                "EventTypeName": "Branches and tags: Created",
                "ResourceType": "Repository",
                "EventTypeId": "codecommit-repository-branches-and-tags-created"
            }
        ],
        "Status": "ENABLED",
        "DetailType": "FULL",
        "Resource": "arn:aws:codecommit:us-west-2:123456789012:MyDemoRepo",
        "Arn": "arn:aws:codestar-notifications:us-west-w:123456789012:notificationrule/dc82df7a-EXAMPLE",
        "Targets": [
            {
                "TargetStatus": "ACTIVE",
                "TargetAddress": "arn:aws:sns:us-west-2:123456789012:MyNotificationTopic",
                "TargetType": "SNS"
            }
        ],
        "Name": "MyNotificationRule",
        "CreatedTimestamp": 1569199844.857,
        "CreatedBy": "arn:aws:iam::123456789012:user/Mary_Major"
    }

For more information, see `View Notification Rules <https://docs.aws.amazon.com/codestar-notifications/latest/userguide/notification-rule-view.html>`__ in the *AWS Developer Tools Console User Guide*.
