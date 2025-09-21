**To delete a notification rule target**

The following ``delete-target`` example removes the specified target from all notification rules configured to use it as a target, and then deletes the target. ::

    aws codestar-notifications  delete-target \
        --target-address arn:aws:sns:us-east-1:123456789012:MyNotificationTopic \
        --force-unsubscribe-all

This command produces no output.

For more information, see `Delete a Notification Rule Target <https://docs.aws.amazon.com/codestar-notifications/latest/userguide/notification-target-delete.html>`__ in the *AWS Developer Tools Console User Guide*.
