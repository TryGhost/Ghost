**To add a tag to a notification rule**

The following ``tag-resource`` example adds a tag with the key name of ``Team`` and the value of ``Li_Juan`` to the specified notification rule. ::

    aws codestar-notifications tag-resource \
        --arn arn:aws:codestar-notifications:us-east-1:123456789012:notificationrule/fe1efd35-EXAMPLE \
        --tags Team=Li_Juan

Output::

    {
        "Tags": {
            "Team": "Li_Juan"
        }
    }

For more information, see `Create a Notification Rule <https://docs.aws.amazon.com/codestar-notifications/latest/userguide/notification-rule-create.html>`__ in the *AWS Developer Tools Console User Guide*.
