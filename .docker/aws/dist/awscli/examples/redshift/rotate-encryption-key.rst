**To rotate encryption key for a cluster**

The following ``rotate-encryption-key`` example rotates the encryption key for the specified cluster. ::

    aws redshift rotate-encryption-key \
        --cluster-identifier mycluster

Output::

    {    
        "Cluster": {
            "ClusterIdentifier": "mycluster",
            "NodeType": "dc2.large",
            "ClusterStatus": "rotating-keys",
            "ClusterAvailabilityStatus": "Modifying",
            "MasterUsername": "adminuser",
            "DBName": "dev",
            "Endpoint": {
                "Address": "mycluster.cmeaswqeuae.us-west-2.redshift.amazonaws.com",
                "Port": 5439
            },
            "ClusterCreateTime": "2019-12-10T19:25:45.886Z",
            "AutomatedSnapshotRetentionPeriod": 30,
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
            "AvailabilityZone": "us-west-2a",
            "PreferredMaintenanceWindow": "sat:16:00-sat:16:30",
            "PendingModifiedValues": {},
            "ClusterVersion": "1.0",
            "AllowVersionUpgrade": true,
            "NumberOfNodes": 2,
            "PubliclyAccessible": false,
            "Encrypted": true,
            "Tags": [],
            "KmsKeyId": "arn:aws:kms:us-west-2:123456789012:key/bPxRfih3yCo8nvbEXAMPLEKEY",
            "EnhancedVpcRouting": false,
            "IamRoles": [
                {
                    "IamRoleArn": "arn:aws:iam::123456789012:role/myRedshiftRole",
                    "ApplyStatus": "in-sync"
                }
            ],
            "MaintenanceTrackName": "current",
            "DeferredMaintenanceWindows": [],
            "NextMaintenanceWindowStartTime": "2019-12-14T16:00:00Z"
        }
    }

For more information, see `Amazon Redshift Database Encryption <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-db-encryption.html>`__ in the *Amazon Redshift Cluster Management Guide*.
