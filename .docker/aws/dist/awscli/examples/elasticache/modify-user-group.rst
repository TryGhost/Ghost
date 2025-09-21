**To modify a user group**

The following ``modify-user-group`` example adds a user to the user group. ::

    aws elasticache modify-user-group \
        --user-group-id myusergroup \
        --user-ids-to-add user1 

Output::

    {
        "UserGroupId": "myusergroup",
        "Status": "modifying",
        "Engine": "redis",
        "UserIds": [
            "default"
        ],
        "PendingChanges": {
            "UserIdsToAdd": [
                "user1"
            ]
        },
        "ReplicationGroups": [],
        "ARN": "arn:aws:elasticache:us-west-2:xxxxxxxxxx52:usergroup:myusergroup"
    }

For more information, see `Authenticating Users with Role-Based Access Control (RBAC) <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Clusters.RBAC.html>`__ in the *Elasticache User Guide*.