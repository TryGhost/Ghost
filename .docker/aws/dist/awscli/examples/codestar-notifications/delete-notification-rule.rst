**To delete a notification rule**

The following ``delete-notification-rule`` example deletes the specified notification rule. ::

    aws codestar-notifications delete-notification-rule \
        --arn arn:aws:codestar-notifications:us-east-1:123456789012:notificationrule/dc82df7a-EXAMPLE

Output::

    {
        "Arn": "arn:aws:codestar-notifications:us-east-1:123456789012:notificationrule/dc82df7a-EXAMPLE"
    }

For more information, see `Delete a Notification Rule <https://docs.aws.amazon.com/codestar-notifications/latest/userguide/notification-rule-delete.html>`__ in the *AWS Developer Tools Console User Guide*.
