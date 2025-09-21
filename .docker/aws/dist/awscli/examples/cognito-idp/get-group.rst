**To get information about a group**

The following ``get-group`` example lists the properties of the user group named ``MyGroup``. This group has a precedence and an IAM role associated with it. ::

    aws cognito-idp get-group \
        --user-pool-id us-west-2_EXAMPLE \
        --group-name MyGroup

Output::

    {
        "Group": {
            "GroupName": "MyGroup",
            "UserPoolId": "us-west-2_EXAMPLE",
            "RoleArn": "arn:aws:iam::123456789012:role/example-cognito-role",
            "Precedence": 7,
            "LastModifiedDate": 1697211218.305,
            "CreationDate": 1611685503.954
        }
    }

For more information, see `Adding groups to a user pool <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html>`__ in the *Amazon Cognito Developer Guide*.
