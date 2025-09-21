Reboot a Cluster
----------------

This example reboots a cluster. By default, the output is in JSON format.

Command::

   aws redshift reboot-cluster --cluster-identifier mycluster

Result::

    {
       "Cluster": {
          "NodeType": "dw.hs1.xlarge",
          "Endpoint": {
             "Port": 5439,
             "Address": "mycluster.coqoarplqhsn.us-east-1.redshift.amazonaws.com"
          },
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
          "AvailabilityZone": "us-east-1a",
          "ClusterCreateTime": "2013-01-22T21:59:29.559Z",
          "PreferredMaintenanceWindow": "sun:23:15-mon:03:15",
          "AutomatedSnapshotRetentionPeriod": 1,
          "ClusterStatus": "rebooting",
          "ClusterIdentifier": "mycluster",
          "DBName": "dev",
          "NumberOfNodes": 2,
          "PendingModifiedValues": {}
       },
       "ResponseMetadata": {
          "RequestId": "61c8b564-64e8-11e2-8f7d-3b939af52818"
       }
    }


