**To get a list of tags attached to a notification rule**

The following ``list-tags-for-resource`` example retrieves a list of all tags attached to the specified notification rule. In this example, the notification rule currently has no tags associated with it. ::

    aws codestar-notifications list-tags-for-resource \
        --arn arn:aws:codestar-notifications:us-east-1:123456789012:notificationrule/fe1efd35-EXAMPLE

Output::

    {
        "Tags": {}
    }

For more information, see `Create a Notification Rule <https://docs.aws.amazon.com/codestar-notifications/latest/userguide/notification-rule-create.html>`__ in the *AWS Developer Tools Console User Guide*.
