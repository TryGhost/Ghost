**To delete a user**

The following ``delete-user`` example deletes a user. ::

    aws elasticache delete-user \
        --user-id user2  

Output::

    {
        "UserId": "user1",
        "UserName": "myUser",
        "Status": "deleting",
        "Engine": "redis",
        "AccessString": "on ~* +@all",
        "UserGroupIds": [
            "myusergroup"
        ],
        "Authentication": {
            "Type": "password",
            "PasswordCount": 1
        },
        "ARN": "arn:aws:elasticache:us-west-2:xxxxxxxxxx52:user:user1"
    }

For more information, see `Authenticating Users with Role-Based Access Control (RBAC) <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Clusters.RBAC.html>`__ in the *Elasticache User Guide*.