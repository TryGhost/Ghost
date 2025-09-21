**To modify cluster maintenance**

The following ``modify-cluster-maintenance`` example defers the maintenance of the specified cluster by 30 days. ::

    aws redshift modify-cluster-maintenance \
        --cluster-identifier mycluster \
        --defer-maintenance \
        --defer-maintenance-duration 30

Output::

    {
        "Cluster": {
            "ClusterIdentifier": "mycluster",
            "NodeType": "dc2.large",
            "ClusterStatus": "available",
            "ClusterAvailabilityStatus": "Available",
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
            "VpcId": "vpc-b1ael7t9",
            "AvailabilityZone": "us-west-2f",
            "PreferredMaintenanceWindow": "sat:16:00-sat:16:30",
            "PendingModifiedValues": {
                "NodeType": "dc2.large",
                "NumberOfNodes": 2,
                "ClusterType": "multi-node"
            },
            "ClusterVersion": "1.0",
            "AllowVersionUpgrade": true,
            "NumberOfNodes": 4,
            "PubliclyAccessible": false,
            "Encrypted": false,
            "ClusterSnapshotCopyStatus": {
                "DestinationRegion": "us-west-1",
                "RetentionPeriod": 7,
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
                    "DeferMaintenanceIdentifier": "dfm-mUdVIfFcT1B4SGhw6fyF",
                    "DeferMaintenanceStartTime": "2019-12-10T18:18:39.354Z",
                    "DeferMaintenanceEndTime": "2020-01-09T18:18:39.354Z"
                }
            ],
            "ExpectedNextSnapshotScheduleTime": "2019-12-11T04:42:55.631Z",
            "ExpectedNextSnapshotScheduleTimeStatus": "OnTrack",
            "NextMaintenanceWindowStartTime": "2020-01-11T16:00:00Z"
        }
    }

For more information, see `Cluster Maintenance <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-clusters.html#rs-cluster-maintenance>`__ in the *Amazon Redshift Cluster Management Guide*.
