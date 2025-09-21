**To modify the account settings for an IAM user or IAM role**

The following ``put-account-setting`` example modifies the account settings for the specified IAM user or IAM role. ::

    aws ecs put-account-setting \
        --name serviceLongArnFormat \
        --value enabled \
        --principal-arn arn:aws:iam::123456789012:user/MyUser

Output::

    {
        "setting": {
            "name": "serviceLongArnFormat",
            "value": "enabled",
            "principalArn": "arn:aws:iam::123456789012:user/MyUser"
        }
    }

