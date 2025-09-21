**To modify the account setting for your IAM user account**

The following ``put-account-setting`` example sets the ``containerInsights`` account setting to ``enhanced`` for your IAM user account. This turns on Container Insights with enhanced observability. ::

    aws ecs put-account-setting \
        --name containerInsights \
        --value enhanced

Output::

    {
        "setting": {
            "name": "containerInsights",
            "value": "enhanced",
            "principalArn": "arn:aws:iam::123456789012:user/johndoe",
            "type": "user"
        }
    }

For more information, see `Modifying Account Settings <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-modifying-longer-id-settings.html>`__ in the *Amazon ECS Developer Guide*.
