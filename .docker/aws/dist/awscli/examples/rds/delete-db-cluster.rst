**Example 1: To delete a DB instance in a DB cluster**

The following ``delete-db-instance`` example deletes the final DB instance in a DB cluster. You can't delete a DB cluster if it contains DB instances that aren't in the **deleting** state. You can't take a final snapshot when deleting a DB instance in a DB cluster. ::

    aws rds delete-db-instance \
        --db-instance-identifier database-3

Output::

    {
        "DBInstance": {
            "DBInstanceIdentifier": "database-3",
            "DBInstanceClass": "db.r4.large",
            "Engine": "aurora-postgresql",
            "DBInstanceStatus": "deleting",
    
        ...output omitted...
    
        }
    }

For more information, see `Deleting a DB Instance in an Aurora DB Cluster <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_DeleteInstance.html>`__ in the *Amazon Aurora User Guide*.

**Example 2: To delete a DB cluster**

The following ``delete-db-cluster`` example deletes the DB cluster named ``mycluster`` and takes a final snapshot named ``mycluster-final-snapshot``. The status of the DB cluster is **available** while the snapshot is being taken. To follow the progress of the deletion, use the ``describe-db-clusters`` CLI command. ::

    aws rds delete-db-cluster \
        --db-cluster-identifier mycluster \
        --no-skip-final-snapshot \
        --final-db-snapshot-identifier mycluster-final-snapshot

Output::

    {
        "DBCluster": {
            "AllocatedStorage": 20,
            "AvailabilityZones": [
                "eu-central-1b",
                "eu-central-1c",
                "eu-central-1a"
            ],
            "BackupRetentionPeriod": 7,
            "DBClusterIdentifier": "mycluster",
            "DBClusterParameterGroup": "default.aurora-postgresql10",
            "DBSubnetGroup": "default-vpc-aa11bb22",
            "Status": "available",
        
        ...output omitted...
        
        }
    }

For more information, see `Aurora Clusters with a Single DB Instance <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_DeleteInstance.html#USER_DeleteInstance.LastInstance>`__ in the *Amazon Aurora User Guide*.