**To delete a user group**

The following ``delete-user-group`` example deletes a user group. ::

    aws elasticache delete-user-group \
        --user-group-id myusergroup

Output::

    {
        "UserGroupId": "myusergroup",
        "Status": "deleting",
        "Engine": "redis",
        "UserIds": [
            "default"
        ],
        "ReplicationGroups": [],
        "ARN": "arn:aws:elasticache:us-west-2:xxxxxxxxxx52:usergroup:myusergroup"
    }

For more information, see `Authenticating Users with Role-Based Access Control (RBAC) <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Clusters.RBAC.html>`__ in the *Elasticache User Guide*.