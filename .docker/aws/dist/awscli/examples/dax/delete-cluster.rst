**To delete a DAX cluster**

The following ``delete-cluster`` example deletes the specified DAX cluster. ::

    aws dax delete-cluster \
        --cluster-name daxcluster

Output::

    {
        "Cluster": {
            "ClusterName": "daxcluster",
            "ClusterArn": "arn:aws:dax:us-west-2:123456789012:cache/daxcluster",
            "TotalNodes": 3,
            "ActiveNodes": 0,
            "NodeType": "dax.r4.large",
            "Status": "deleting",
            "ClusterDiscoveryEndpoint": {
                "Address": "dd.ey3o9d.clustercfg.dax.usw2.cache.amazonaws.com",
                "Port": 8111
            },
            "PreferredMaintenanceWindow": "fri:06:00-fri:07:00",
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
    }

For more information, see `Managing DAX Clusters <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.cluster-management.html#DAX.cluster-management.deleting>`__ in the *Amazon DynamoDB Developer Guide*.
