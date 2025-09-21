Authorize an AWS Account to Restore a Snapshot
----------------------------------------------

This example authorizes the AWS account ``444455556666`` to restore the snapshot ``my-snapshot-id``.
By default, the output is in JSON format.

Command::

   aws redshift authorize-snapshot-access --snapshot-id my-snapshot-id --account-with-restore-access 444455556666

Result::

    {
       "Snapshot": {
          "Status": "available",
          "SnapshotCreateTime": "2013-07-17T22:04:18.947Z",
          "EstimatedSecondsToCompletion": 0,
          "AvailabilityZone": "us-east-1a",
          "ClusterVersion": "1.0",
          "MasterUsername": "adminuser",
          "Encrypted": false,
          "OwnerAccount": "111122223333",
          "BackupProgressInMegabytes": 11.0,
          "ElapsedTimeInSeconds": 0,
          "DBName": "dev",
          "CurrentBackupRateInMegabytesPerSecond: 0.1534,
          "ClusterCreateTime": "2013-01-22T21:59:29.559Z",
          "ActualIncrementalBackupSizeInMegabytes"; 11.0,
          "SnapshotType": "manual",
          "NodeType": "dw.hs1.xlarge",
          "ClusterIdentifier": "mycluster",
          "TotalBackupSizeInMegabytes": 20.0,
          "Port": 5439,
          "NumberOfNodes": 2,
          "SnapshotIdentifier": "my-snapshot-id"
       }
    }


