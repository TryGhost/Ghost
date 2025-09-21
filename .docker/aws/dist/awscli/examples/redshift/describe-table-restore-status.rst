**To describe status of table restore requests from a cluster snapshot**

The following ``describe-table-restore-status`` example displays details for table restore requests made for the specified cluster. ::

    aws redshift describe-table-restore-status /
        --cluster-identifier mycluster

Output::

    {
        "TableRestoreStatusDetails": [
            {
                "TableRestoreRequestId": "z1116630-0e80-46f4-ba86-bd9670411ebd",
                "Status": "IN_PROGRESS",
                "RequestTime": "2019-12-27T18:22:12.257Z",
                "ClusterIdentifier": "mycluster",
                "SnapshotIdentifier": "mysnapshotid",
                "SourceDatabaseName": "dev",
                "SourceSchemaName": "public",
                "SourceTableName": "mytable",
                "TargetDatabaseName": "dev",
                "TargetSchemaName": "public",
                "NewTableName": "mytable-clone"
            }
        ]
    }

For more information, see `Restoring a Table from a Snapshot <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-snapshots.html#working-with-snapshot-restore-table-from-snapshot>`__ in the *Amazon Redshift Cluster Management Guide*.
