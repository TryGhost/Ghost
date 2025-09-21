**To delete a replication group**

The following ``delete-replication-group`` example deletes an existing replication group. By default, this operation deletes the entire replication group, including the primary/primaries and all of the read replicas. If the replication group has only one primary, you can optionally delete only the read replicas, while retaining the primary by setting RetainPrimaryCluster=true .

When you receive a successful response from this operation, Amazon ElastiCache immediately begins deleting the selected resources; you cannot cancel or revert this operation. Valid for Redis only. ::

    aws elasticache delete-replication-group \
        --replication-group-id "mygroup" 

Output::

   {
        "ReplicationGroup": {
            "ReplicationGroupId": "mygroup",
            "Description": "my group",
            "Status": "deleting",
            "PendingModifiedValues": {},
            "AutomaticFailover": "disabled",
            "SnapshotRetentionLimit": 0,
            "SnapshotWindow": "06:00-07:00",
            "TransitEncryptionEnabled": false,
            "AtRestEncryptionEnabled": false
        }
    }