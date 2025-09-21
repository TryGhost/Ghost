**To resize cluster**

The following ``resize-cluster`` example resizes the specified cluster. ::

    aws redshift resize-cluster \
        --cluster-identifier mycluster \
        --cluster-type multi-node \
        --node-type dc2.large \
        --number-of-nodes 6 \
        --classic

Output::

    {
        "Cluster": {
            "ClusterIdentifier": "mycluster",
            "NodeType": "dc2.large",
            "ClusterStatus": "resizing",
            "ClusterAvailabilityStatus": "Modifying",
            "MasterUsername": "adminuser",
            "DBName": "dev",
            "Endpoint": {
                "Address": "mycluster.cmeaswqeuae.us-west-2.redshift.amazonaws.com",
                "Port": 5439
            },
            "ClusterCreateTime": "2019-12-05T18:44:36.991Z",
            "AutomatedSnapshotRetentionPeriod": 3,
            "ManualSnapshotRetentionPeriod": -1,
            "ClusterSecurityGroups": [],
            "VpcSecurityGroups": [
                {
                    "VpcSecurityGroupId": "sh-a1a123ab",
                    "Status": "active"
                }
            ],
            "ClusterParameterGroups": [
                {
                    "ParameterGroupName": "default.redshift-1.0",
                    "ParameterApplyStatus": "in-sync"
                }
            ],
            "ClusterSubnetGroupName": "default",
            "VpcId": "vpc-a1abc1a1",
            "AvailabilityZone": "us-west-2f",
            "PreferredMaintenanceWindow": "sat:16:00-sat:16:30",
            "PendingModifiedValues": {
                "NodeType": "dc2.large",
                "NumberOfNodes": 6,
                "ClusterType": "multi-node"
            },
            "ClusterVersion": "1.0",
            "AllowVersionUpgrade": true,
            "NumberOfNodes": 4,
            "PubliclyAccessible": false,
            "Encrypted": false,
            "ClusterSnapshotCopyStatus": {
                "DestinationRegion": "us-west-1",
                "RetentionPeriod": 15,
                "ManualSnapshotRetentionPeriod": -1
            },
            "Tags": [
                {
                    "Key": "mytags",
                    "Value": "tag1"
                }
            ],
            "EnhancedVpcRouting": false,
            "IamRoles": [],
            "MaintenanceTrackName": "current",
            "DeferredMaintenanceWindows": [
                {
                    "DeferMaintenanceIdentifier": "dfm-mUdVCfDcT1B4SGhw6fyF",
                    "DeferMaintenanceStartTime": "2019-12-10T18:18:39.354Z",
                    "DeferMaintenanceEndTime": "2020-01-09T18:18:39.354Z"
                }
            ],
            "NextMaintenanceWindowStartTime": "2020-01-11T16:00:00Z",
            "ResizeInfo": {
                "ResizeType": "ClassicResize",
                "AllowCancelResize": true
            }
        }
    }

For more information, see `Resizing a Cluster <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-clusters.html#cluster-resize-intro>`__ in the *Amazon Redshift Cluster Management Guide*.
