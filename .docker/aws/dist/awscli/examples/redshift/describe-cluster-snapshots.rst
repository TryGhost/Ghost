Get a Description of All Cluster Snapshots
------------------------------------------

This example returns a description of all cluster snapshots for the
account.  By default, the output is in JSON format.

Command::

   aws redshift describe-cluster-snapshots

Result::

    {
       "Snapshots": [
          {
             "Status": "available",
             "SnapshotCreateTime": "2013-07-17T22:02:22.852Z",
             "EstimatedSecondsToCompletion": -1,
             "AvailabilityZone": "us-east-1a",
             "ClusterVersion": "1.0",
             "MasterUsername": "adminuser",
             "Encrypted": false,
             "OwnerAccount": "111122223333",
             "BackupProgressInMegabytes": 20.0,
             "ElapsedTimeInSeconds": 0,
             "DBName": "dev",
             "CurrentBackupRateInMegabytesPerSecond: 0.0,
             "ClusterCreateTime": "2013-01-22T21:59:29.559Z",
             "ActualIncrementalBackupSizeInMegabytes"; 20.0
             "SnapshotType": "automated",
             "NodeType": "dw.hs1.xlarge",
             "ClusterIdentifier": "mycluster",
             "Port": 5439,
             "TotalBackupSizeInMegabytes": 20.0,
             "NumberOfNodes": "2",
             "SnapshotIdentifier": "cm:mycluster-2013-01-22-22-04-18"
          },
          {
             "EstimatedSecondsToCompletion": 0,
             "OwnerAccount": "111122223333",
             "CurrentBackupRateInMegabytesPerSecond: 0.1534,
             "ActualIncrementalBackupSizeInMegabytes"; 11.0,
             "NumberOfNodes": "2",
             "Status": "available",
             "ClusterVersion": "1.0",
             "MasterUsername": "adminuser",
             "AccountsWithRestoreAccess": [
                {
                   "AccountID": "444455556666"
                } ],
             "TotalBackupSizeInMegabytes": 20.0,
             "DBName": "dev",
             "BackupProgressInMegabytes": 11.0,
             "ClusterCreateTime": "2013-01-22T21:59:29.559Z",
             "ElapsedTimeInSeconds": 0,
             "ClusterIdentifier": "mycluster",
             "SnapshotCreateTime": "2013-07-17T22:04:18.947Z",
             "AvailabilityZone": "us-east-1a",
             "NodeType": "dw.hs1.xlarge",
             "Encrypted": false,
             "SnapshotType": "manual",
             "Port": 5439,
             "SnapshotIdentifier": "my-snapshot-id"
          } ]
       }
       (...remaining output omitted...)


