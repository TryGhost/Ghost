**To update auto scaling settings across replicas of a global table**

The following ``update-table-replica-auto-scaling`` example updates write capacity auto scaling settings across replicas of the specified global table. ::

    aws dynamodb update-table-replica-auto-scaling \
        --table-name MusicCollection \
        --provisioned-write-capacity-auto-scaling-update file://auto-scaling-policy.json

Contents of ``auto-scaling-policy.json``::

    {
        "MinimumUnits": 10,
        "MaximumUnits": 100,
        "AutoScalingDisabled": false,
        "ScalingPolicyUpdate": {
            "PolicyName": "DynamoDBWriteCapacityUtilization:table/MusicCollection",
            "TargetTrackingScalingPolicyConfiguration": {
                "TargetValue": 80
            }
        }
    }

Output::

    {
        "TableAutoScalingDescription": {
            "TableName": "MusicCollection",
            "TableStatus": "ACTIVE",
            "Replicas": [
                {
                    "RegionName": "eu-central-1",
                    "GlobalSecondaryIndexes": [],
                    "ReplicaProvisionedReadCapacityAutoScalingSettings": {
                        "MinimumUnits": 5,
                        "MaximumUnits": 40000,
                        "AutoScalingRoleArn": "arn:aws:iam::123456789012:role/aws-service-role/dynamodb.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_DynamoDBTable",
                        "ScalingPolicies": [
                            {
                                "PolicyName": "DynamoDBReadCapacityUtilization:table/MusicCollection",
                                "TargetTrackingScalingPolicyConfiguration": {
                                    "TargetValue": 70.0
                                }
                            }
                        ]
                    },
                    "ReplicaProvisionedWriteCapacityAutoScalingSettings": {
                        "MinimumUnits": 10,
                        "MaximumUnits": 100,
                        "AutoScalingRoleArn": "arn:aws:iam::123456789012:role/aws-service-role/dynamodb.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_DynamoDBTable",
                        "ScalingPolicies": [
                            {
                                "PolicyName": "DynamoDBWriteCapacityUtilization:table/MusicCollection",
                                "TargetTrackingScalingPolicyConfiguration": {
                                    "TargetValue": 80.0
                                }
                            }
                        ]
                    },
                    "ReplicaStatus": "ACTIVE"
                },
                {
                    "RegionName": "us-east-1",
                    "GlobalSecondaryIndexes": [],
                    "ReplicaProvisionedReadCapacityAutoScalingSettings": {
                        "MinimumUnits": 5,
                        "MaximumUnits": 40000,
                        "AutoScalingRoleArn": "arn:aws:iam::123456789012:role/aws-service-role/dynamodb.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_DynamoDBTable",
                        "ScalingPolicies": [
                            {
                                "PolicyName": "DynamoDBReadCapacityUtilization:table/MusicCollection",
                                "TargetTrackingScalingPolicyConfiguration": {
                                    "TargetValue": 70.0
                                }
                            }
                        ]
                    },
                    "ReplicaProvisionedWriteCapacityAutoScalingSettings": {
                        "MinimumUnits": 10,
                        "MaximumUnits": 100,
                        "AutoScalingRoleArn": "arn:aws:iam::123456789012:role/aws-service-role/dynamodb.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_DynamoDBTable",
                        "ScalingPolicies": [
                            {
                                "PolicyName": "DynamoDBWriteCapacityUtilization:table/MusicCollection",
                                "TargetTrackingScalingPolicyConfiguration": {
                                    "TargetValue": 80.0
                                }
                            }
                        ]
                    },
                    "ReplicaStatus": "ACTIVE"
                },
                {
                    "RegionName": "us-east-2",
                    "GlobalSecondaryIndexes": [],
                    "ReplicaProvisionedReadCapacityAutoScalingSettings": {
                        "MinimumUnits": 5,
                        "MaximumUnits": 40000,
                        "AutoScalingRoleArn": "arn:aws:iam::123456789012:role/aws-service-role/dynamodb.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_DynamoDBTable",
                        "ScalingPolicies": [
                            {
                                "PolicyName": "DynamoDBReadCapacityUtilization:table/MusicCollection",
                                "TargetTrackingScalingPolicyConfiguration": {
                                    "TargetValue": 70.0
                                }
                            }
                        ]
                    },
                    "ReplicaProvisionedWriteCapacityAutoScalingSettings": {
                        "MinimumUnits": 10,
                        "MaximumUnits": 100,
                        "AutoScalingRoleArn": "arn:aws:iam::123456789012:role/aws-service-role/dynamodb.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_DynamoDBTable",
                        "ScalingPolicies": [
                            {
                                "PolicyName": "DynamoDBWriteCapacityUtilization:table/MusicCollection",
                                "TargetTrackingScalingPolicyConfiguration": {
                                    "TargetValue": 80.0
                                }
                            }
                        ]
                    },
                    "ReplicaStatus": "ACTIVE"
                }
            ]
        }
    }

For more information, see `DynamoDB Global Tables <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html>`__ in the *Amazon DynamoDB Developer Guide*.
