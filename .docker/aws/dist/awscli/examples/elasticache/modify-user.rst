**To modify a user**

The following ``modify-user`` example modifies a user's access string. ::

    aws elasticache modify-user \
        --user-id user2 \
        --append-access-string "on ~* +@all" 

Output::

    {
        "UserId": "user2",
        "UserName": "myUser",
        "Status": "modifying",
        "Engine": "redis",
        "AccessString": "on ~* +@all",
        "UserGroupIds": [],
        "Authentication": {
            "Type": "password",
            "PasswordCount": 1
        },
        "ARN": "arn:aws:elasticache:us-west-2:xxxxxxxxxx52:user:user2"
    }

For more information, see `Authenticating Users with Role-Based Access Control (RBAC) <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Clusters.RBAC.html>`__ in the *Elasticache User Guide*.