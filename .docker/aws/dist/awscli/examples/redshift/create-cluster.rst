Create a Cluster with Minimal Parameters
----------------------------------------

This example creates a cluster with the minimal set of parameters. By default, the output is in JSON format.

Command::

   aws redshift create-cluster --node-type dw.hs1.xlarge --number-of-nodes 2 --master-username adminuser --master-user-password TopSecret1 --cluster-identifier mycluster

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
             } ],
          "ClusterSecurityGroups": [
             {
                "Status": "active",
                "ClusterSecurityGroupName": "default"
             } ],
          "AllowVersionUpgrade": true,
          "VpcSecurityGroups": \[],
          "PreferredMaintenanceWindow": "sat:03:30-sat:04:00",
          "AutomatedSnapshotRetentionPeriod": 1,
          "ClusterStatus": "creating",
          "ClusterIdentifier": "mycluster",
          "DBName": "dev",
          "NumberOfNodes": 2,
          "PendingModifiedValues": {
             "MasterUserPassword": "\****"
          }
       },
       "ResponseMetadata": {
          "RequestId": "7cf4bcfc-64dd-11e2-bea9-49e0ce183f07"
       }
    }


