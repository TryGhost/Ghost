Create a Cluster Snapshot
-------------------------

This example creates a new cluster snapshot.  By default, the output is in JSON format.

Command::

   aws redshift create-cluster-snapshot --cluster-identifier mycluster --snapshot-identifier my-snapshot-id

Result::

    {
       "Snapshot": {
          "Status": "creating",
          "SnapshotCreateTime": "2013-01-22T22:20:33.548Z",
          "AvailabilityZone": "us-east-1a",
          "ClusterVersion": "1.0",
          "MasterUsername": "adminuser",
          "DBName": "dev",
          "ClusterCreateTime": "2013-01-22T21:59:29.559Z",
          "SnapshotType": "manual",
          "NodeType": "dw.hs1.xlarge",
          "ClusterIdentifier": "mycluster",
          "Port": 5439,
          "NumberOfNodes": "2",
          "SnapshotIdentifier": "my-snapshot-id"
       },
       "ResponseMetadata": {
          "RequestId": "f024d1a5-64e1-11e2-88c5-53eb05787dfb"
       }
    }


