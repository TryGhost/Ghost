**To return information about all provisioned DAX clusters**

The following ``describe-clusters`` example displays details about all provisioned DAX clusters. ::

    aws dax describe-clusters

Output::

    {
        "Clusters": [
            {
                "ClusterName": "daxcluster",
                "ClusterArn": "arn:aws:dax:us-west-2:123456789012:cache/daxcluster",
                "TotalNodes": 1,
                "ActiveNodes": 1,
                "NodeType": "dax.r4.large",
                "Status": "available",
                "ClusterDiscoveryEndpoint": {
                    "Address": "daxcluster.ey3o9d.clustercfg.dax.usw2.cache.amazonaws.com",
                    "Port": 8111
                },
                "Nodes": [
                    {
                        "NodeId": "daxcluster-a",
                        "Endpoint": {
                            "Address": "daxcluster-a.ey3o9d.0001.dax.usw2.cache.amazonaws.com",
                            "Port": 8111
                        },
                        "NodeCreateTime": 1576625059.509,
                        "AvailabilityZone": "us-west-2c",
                        "NodeStatus": "available",
                        "ParameterGroupStatus": "in-sync"
                    }
                ],
                "PreferredMaintenanceWindow": "thu:13:00-thu:14:00",
                "SubnetGroup": "default",
                "SecurityGroups": [
                    {
                        "SecurityGroupIdentifier": "sg-1af6e36e",
                        "Status": "active"
                    }
                ],
                "IamRoleArn": "arn:aws:iam::123456789012:role/DAXServiceRoleForDynamoDBAccess",
                "ParameterGroup": {
                    "ParameterGroupName": "default.dax1.0",
                    "ParameterApplyStatus": "in-sync",
                    "NodeIdsToReboot": []
                },
                "SSEDescription": {
                    "Status": "ENABLED"
                }
            }
        ]
    }

For more information, see `Managing DAX Clusters <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.cluster-management.html>`__ in the *Amazon DynamoDB Developer Guide*.
