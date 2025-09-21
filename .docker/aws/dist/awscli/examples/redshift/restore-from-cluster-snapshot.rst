Restore a Cluster From a Snapshot
---------------------------------

This example restores a cluster from a snapshot.

Command::

   aws redshift restore-from-cluster-snapshot --cluster-identifier mycluster-clone --snapshot-identifier my-snapshot-id

Result::

    {
       "Cluster": {
          "NodeType": "dw.hs1.xlarge",
          "ClusterVersion": "1.0",
          "PubliclyAccessible": "true",
          "MasterUsername": "adminuser",
          "ClusterParameterGroups": [
             {
             "ParameterApplyStatus": "in-sync",
             "ParameterGroupName": "default.redshift-1.0"
             }
          ],
          "ClusterSecurityGroups": [
             {
             "Status": "active",
             "ClusterSecurityGroupName": "default"
             }
          ],
          "AllowVersionUpgrade": true,
          "VpcSecurityGroups": \[],
          "PreferredMaintenanceWindow": "sun:23:15-mon:03:15",
          "AutomatedSnapshotRetentionPeriod": 1,
          "ClusterStatus": "creating",
          "ClusterIdentifier": "mycluster-clone",
          "DBName": "dev",
          "NumberOfNodes": 2,
          "PendingModifiedValues": {}
       },
       "ResponseMetadata": {
          "RequestId": "77fd512b-64e3-11e2-8f5b-e90bd6c77476"
       }
    }

