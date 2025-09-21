**To restore table from a cluster snapshot**

The following ``restore-table-from-cluster-snapshot`` example creates a new table from the specified table in the specified cluster snapshot. ::

    aws redshift restore-table-from-cluster-snapshot /
        --cluster-identifier mycluster /
        --snapshot-identifier mycluster-2019-11-19-16-17 /
        --source-database-name dev /
        --source-schema-name public /
        --source-table-name mytable /
        --target-database-name dev /
        --target-schema-name public /
        --new-table-name mytable-clone

Output::

    {
        "TableRestoreStatus": {
            "TableRestoreRequestId": "a123a12b-abc1-1a1a-a123-a1234ab12345",
            "Status": "PENDING",
            "RequestTime": "2019-12-20T00:20:16.402Z",
            "ClusterIdentifier": "mycluster",
            "SnapshotIdentifier": "mycluster-2019-11-19-16-17",
            "SourceDatabaseName": "dev",
            "SourceSchemaName": "public",
            "SourceTableName": "mytable",
            "TargetDatabaseName": "dev",
            "TargetSchemaName": "public",
            "NewTableName": "mytable-clone"
        }
    }

For more information, see `Restoring a Table from a Snapshot <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-snapshots.html#working-with-snapshot-restore-table-from-snapshot>`__ in the *Amazon Redshift Cluster Management Guide*.
