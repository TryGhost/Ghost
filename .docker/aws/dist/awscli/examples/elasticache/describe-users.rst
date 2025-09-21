**To describe users**

The following ``describe-users`` example returns a list of users. ::

    aws elasticache describe-users 

Output::

    {
        "Users": [
            {
                "UserId": "default",
                "UserName": "default",
                "Status": "active",
                "Engine": "redis",
                "AccessString": "on ~* +@all",
                "UserGroupIds": [
                    "myusergroup"
                ],
                "Authentication": {
                    "Type": "no-password"
                },
                "ARN": "arn:aws:elasticache:us-west-2:xxxxxxxxxx52:user:default"
            },
            {
                "UserId": "user1",
                "UserName": "myUser",
                "Status": "active",
                "Engine": "redis",
                "AccessString": "on ~* +@all",
                "UserGroupIds": [],
                "Authentication": {
                    "Type": "password",
                    "PasswordCount": 1
                },
                "ARN": "arn:aws:elasticache:us-west-2:xxxxxxxxxx52:user:user1"
            },
            {
                "UserId": "user2",
                "UserName": "myUser",
                "Status": "active",
                "Engine": "redis",
                "AccessString": "on ~app::* -@all +@read +@hash +@bitmap +@geo -setbit -bitfield -hset -hsetnx -hmset -hincrby -hincrbyfloat -hdel -bitop -geoadd -georadius -georadiusbymember",
                "UserGroupIds": [],
                "Authentication": {
                    "Type": "password",
                    "PasswordCount": 1
                },
                "ARN": "arn:aws:elasticache:us-west-2:xxxxxxxxxx52:user:user2"
            }
        ]
    }

For more information, see `Authenticating Users with Role-Based Access Control (RBAC) <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Clusters.RBAC.html>`__ in the *Elasticache User Guide*.