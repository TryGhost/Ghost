**To create a user**

The following ``create-user`` example creates a new user. ::

    aws elasticache create-user \
        --user-id user1 \
        --user-name myUser \
        --passwords mYnuUzrpAxXw2rdzx \
        --engine redis \
        --access-string "on ~app::* -@all +@read"

Output::

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

For more information, see `Authenticating Users with Role-Based Access Control (RBAC) <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Clusters.RBAC.html>`__ in the *Elasticache User Guide*.