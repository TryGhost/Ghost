**To create a DAX cluster**

The following ``create-cluster`` example creates a DAX cluster with the specified settings. ::

    aws dax create-cluster \
        --cluster-name daxcluster \
        --node-type dax.r4.large \
        --replication-factor 3 \
        --iam-role-arn roleARN  \
        --sse-specification Enabled=true
	
Output::

    {
        "Cluster": {
            "ClusterName": "daxcluster",
            "ClusterArn": "arn:aws:dax:us-west-2:123456789012:cache/daxcluster",
            "TotalNodes": 3,
            "ActiveNodes": 0,
            "NodeType": "dax.r4.large",
            "Status": "creating",
            "ClusterDiscoveryEndpoint": {
                "Port": 8111
            },
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
    }

For more information, see `Step 3: Create a DAX Cluster <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.create-cluster.cli.create-cluster.html>`__ in the *Amazon DynamoDB Developer Guide*.
