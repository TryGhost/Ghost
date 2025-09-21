**To modify the default account settings**

The following ``put-account-setting-default`` example modifies the default account setting for all IAM users or roles on your account. These changes apply to the entire AWS account unless an IAM user or role explicitly overrides these settings for themselves. ::

    aws ecs put-account-setting-default --name serviceLongArnFormat --value enabled

Output::

    {
        "setting": {
            "name": "serviceLongArnFormat",
            "value": "enabled",
            "principalArn": "arn:aws:iam::123456789012:root"
        }
    }

For more information, see `Amazon Resource Names (ARNs) and IDs <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-resource-ids.html>`_ in the *Amazon ECS Developer Guide*.