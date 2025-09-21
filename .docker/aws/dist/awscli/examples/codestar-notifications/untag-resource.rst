**To remove a tag from a notification rule**

The following ``untag-resource`` example removes the tag with the key name ``Team`` from the specified notification rule. ::

    aws codestar-notifications untag-resource \
        --arn arn:aws:codestar-notifications:us-east-1:123456789012:notificationrule/fe1efd35-EXAMPLE \
        --tag-keys Team

This command produces no output.

For more information, see `Edit a Notification Rule <https://docs.aws.amazon.com/codestar-notifications/latest/userguide/notification-rule-edit.html>`__ in the *AWS Developer Tools Console User Guide*.
