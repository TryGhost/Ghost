**To modify the IAM role for a cluster**

The following ``modify-cluster-iam-roles`` example removes the specified AWS IAM role from the specified cluster. ::

    aws redshift modify-cluster-iam-roles \
        --cluster-identifier mycluster \
        --remove-iam-roles arn:aws:iam::123456789012:role/myRedshiftRole

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
                    "VpcSecurityGroupId": "sh-f9b731sd",
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
            "VpcId": "vpc-b2fal7t9",
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
            "DeferredMaintenanceWindows": [],
            "ExpectedNextSnapshotScheduleTime": "2019-12-11T04:42:55.631Z",
            "ExpectedNextSnapshotScheduleTimeStatus": "OnTrack",
            "NextMaintenanceWindowStartTime": "2019-12-14T16:00:00Z"
        }
    }

For more information, see `Using Identity-Based Policies (IAM Policies) for Amazon Redshift <https://docs.aws.amazon.com/redshift/latest/mgmt/redshift-iam-access-control-identity-based.html>`__ in the *Amazon Redshift Cluster Management Guide*.
