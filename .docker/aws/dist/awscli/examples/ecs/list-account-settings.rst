**Example 1: To view the account settings for an account**

The following ``list-account-settings`` example displays the effective account settings for an account. ::

    aws ecs list-account-settings --effective-settings

Output::

    {
        "settings": [
            {
                "name": "containerInstanceLongArnFormat",
                "value": "enabled",
                "principalArn": "arn:aws:iam::123456789012:root"
            },
            {
                "name": "serviceLongArnFormat",
                "value": "enabled",
                "principalArn": "arn:aws:iam::123456789012:root"
            },
            {
                "name": "taskLongArnFormat",
                "value": "enabled",
                "principalArn": "arn:aws:iam::123456789012:root"
            }
        ]
    }

**Example 2: To view the account settings for a specific IAM user or IAM role**

The following ``list-account-settings`` example displays the account settings for the specified IAM user or IAM role. ::

    aws ecs list-account-settings --principal-arn arn:aws:iam::123456789012:user/MyUser

Output::

    {
        "settings": [
            {
                "name": "serviceLongArnFormat",
                "value": "enabled",
                "principalArn": "arn:aws:iam::123456789012:user/MyUser"
            }
        ]
    }

For more information, see `Amazon Resource Names (ARNs) and IDs <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-resource-ids.html>`_ in the *Amazon ECS Developer Guide*.