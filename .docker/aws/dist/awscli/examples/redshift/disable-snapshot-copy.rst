**To disable snapshot copy for a cluster**

The following ``disable-snapshot-copy`` example disables the automatic copy of a snapshot for the specified cluster. ::

    aws redshift disable-snapshot-copy \
        --cluster-identifier mycluster

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
                    "VpcSecurityGroupId": "sh-i9b431cd",
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
            "VpcId": "vpc-b1fel7t9",
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
            "Tags": [
                {
                    "Key": "mytags",
                    "Value": "tag1"
                }
            ],
            "EnhancedVpcRouting": false,
            "IamRoles": [
                {
                    "IamRoleArn": "arn:aws:iam::123456789012:role/myRedshiftRole",
                    "ApplyStatus": "in-sync"
                }
            ],
            "MaintenanceTrackName": "current",
            "DeferredMaintenanceWindows": [],
            "ExpectedNextSnapshotScheduleTime": "2019-12-10T04:42:43.390Z",
            "ExpectedNextSnapshotScheduleTimeStatus": "OnTrack",
            "NextMaintenanceWindowStartTime": "2019-12-14T16:00:00Z"
        }
    }

For more information, see `Copying Snapshots to Another AWS Region <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-snapshots.html#cross-region-snapshot-copy>`__ in the *Amazon Redshift Cluster Management Guide*.
