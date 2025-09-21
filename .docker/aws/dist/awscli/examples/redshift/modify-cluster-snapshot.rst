**To modify cluster snapshot**

The following ``modify-cluster-snapshot`` example sets the manual retention period setting for the specified cluster snapshot to value of 10 days. ::

    aws redshift modify-cluster-snapshot \
        --snapshot-identifier mycluster-2019-11-06-16-32 \
        --manual-snapshot-retention-period 10

Output::

    {
        "Snapshot": {
            "SnapshotIdentifier": "mycluster-2019-11-06-16-32",
            "ClusterIdentifier": "mycluster",
            "SnapshotCreateTime": "2019-12-07T00:34:05.633Z",
            "Status": "available",
            "Port": 5439,
            "AvailabilityZone": "us-west-2f",
            "ClusterCreateTime": "2019-12-05T18:44:36.991Z",
            "MasterUsername": "adminuser",
            "ClusterVersion": "1.0",
            "SnapshotType": "manual",
            "NodeType": "dc2.large",
            "NumberOfNodes": 2,
            "DBName": "dev",
            "VpcId": "vpc-b1cel7t9",
            "Encrypted": false,
            "EncryptedWithHSM": false,
            "OwnerAccount": "123456789012",
            "TotalBackupSizeInMegaBytes": 64384.0,
            "ActualIncrementalBackupSizeInMegaBytes": 24.0,
            "BackupProgressInMegaBytes": 24.0,
            "CurrentBackupRateInMegaBytesPerSecond": 13.0011,
            "EstimatedSecondsToCompletion": 0,
            "ElapsedTimeInSeconds": 1,
            "Tags": [
                {
                    "Key": "mytagkey",
                    "Value": "mytagvalue"
                }
            ],
            "EnhancedVpcRouting": false,
            "MaintenanceTrackName": "current",
            "ManualSnapshotRetentionPeriod": 10,
            "ManualSnapshotRemainingDays": 6,
            "SnapshotRetentionStartTime": "2019-12-07T00:34:07.479Z"
        }
    }

For more information, see `Amazon Redshift Snapshots <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-snapshots.html>`__ in the *Amazon Redshift Cluster Management Guide*.
