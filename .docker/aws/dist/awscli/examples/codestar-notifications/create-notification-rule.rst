**To create a notification rule**

The following ``create-notification-rule`` example uses a JSON file named ``rule.json`` to create a notification rule named ``MyNotificationRule`` for a repository named ``MyDemoRepo`` in the specified AWS account. Notifications with the ``FULL`` detail type are sent to the specified target Amazon SNS topic when branches and tags are created. ::

    aws codestar-notifications create-notification-rule \
        --cli-input-json file://rule.json

Contents of ``rule.json``::

    {
        "Name": "MyNotificationRule",
        "EventTypeIds": [
            "codecommit-repository-branches-and-tags-created"
        ],
        "Resource": "arn:aws:codecommit:us-east-1:123456789012:MyDemoRepo",
        "Targets": [
            {
                "TargetType": "SNS",
                "TargetAddress": "arn:aws:sns:us-east-1:123456789012:MyNotificationTopic"
            }
        ],
        "Status": "ENABLED",
        "DetailType": "FULL"
    }

Output::

    {
        "Arn": "arn:aws:codestar-notifications:us-east-1:123456789012:notificationrule/dc82df7a-EXAMPLE"
    }

For more information, see `Create a Notification rule <https://docs.aws.amazon.com/codestar-notifications/latest/userguide/notification-rule-create.html>`__ in the *AWS Developer Tools Console User Guide*.
