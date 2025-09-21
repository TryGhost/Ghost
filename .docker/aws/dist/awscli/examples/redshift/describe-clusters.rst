Get a Description of All Clusters
---------------------------------

This example returns a description of all clusters for the account.  By default, the output is in JSON format.

Command::

   aws redshift describe-clusters

Result::

    {
       "Clusters": [
       {
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
             } ],
          "ClusterSecurityGroups": [
             {
                "Status": "active",
                "ClusterSecurityGroupName": "default"
             } ],
          "AllowVersionUpgrade": true,
          "VpcSecurityGroups": \[],
          "AvailabilityZone": "us-east-1a",
          "ClusterCreateTime": "2013-01-22T21:59:29.559Z",
          "PreferredMaintenanceWindow": "sat:03:30-sat:04:00",
          "AutomatedSnapshotRetentionPeriod": 1,
          "ClusterStatus": "available",
          "ClusterIdentifier": "mycluster",
          "DBName": "dev",
          "NumberOfNodes": 2,
          "PendingModifiedValues": {}
       } ],
       "ResponseMetadata": {
          "RequestId": "65b71cac-64df-11e2-8f5b-e90bd6c77476"
       }
    }

You can also obtain the same information in text format using the ``--output text`` option.

Command::

   aws redshift describe-clusters --output text

Result::

    dw.hs1.xlarge	1.0	true	adminuser	True	us-east-1a	2013-01-22T21:59:29.559Z	sat:03:30-sat:04:00	1	available	mycluster	dev	2
    ENDPOINT	5439	mycluster.coqoarplqhsn.us-east-1.redshift.amazonaws.com
    in-sync	default.redshift-1.0
    active	default
    PENDINGMODIFIEDVALUES
    RESPONSEMETADATA	934281a8-64df-11e2-b07c-f7fbdd006c67

