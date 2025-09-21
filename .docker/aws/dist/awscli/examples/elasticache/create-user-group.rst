**To create a user group**

The following ``create-user-group`` example creates a new user group. ::

    aws elasticache create-user-group \
        --user-group-id myusergroup \
        --engine redis \
        --user-ids default

Output::

    {
        "UserGroupId": "myusergroup",
        "Status": "creating",
        "Engine": "redis",
        "UserIds": [
            "default"
        ],
        "ReplicationGroups": [],
        "ARN": "arn:aws:elasticache:us-west-2:xxxxxxxxxx52:usergroup:myusergroup"
    }

For more information, see `Authenticating Users with Role-Based Access Control (RBAC) <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Clusters.RBAC.html>`__ in the *Elasticache User Guide*.
