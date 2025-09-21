**To modify snapshot copy retention period**

The following ``modify-snapshot-copy-retention-period`` example modifies the number of days to retain snapshots for the specified cluster in the destination AWS Region after they are copied from the source AWS Region. ::

    aws redshift modify-snapshot-copy-retention-period \
        --cluster-identifier mycluster \
        --retention-period 15

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
            "VpcId": "vpc-b1fet7t9",
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
                    "DeferMaintenanceIdentifier": "dfm-mUdVSfDcT1F4SGhw6fyF",
                    "DeferMaintenanceStartTime": "2019-12-10T18:18:39.354Z",
                    "DeferMaintenanceEndTime": "2020-01-09T18:18:39.354Z"
                }
            ],
            "NextMaintenanceWindowStartTime": "2020-01-11T16:00:00Z"
        }
    }

For more information, see `Snapshot Schedule Format <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-snapshots.html#working-with-snapshot-scheduling>`__ in the *Amazon Redshift Cluster Management Guide*.
