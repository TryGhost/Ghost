**To view auto scaling settings across replicas of a global table**

The following ``describe-table-replica-auto-scaling`` example displays auto scaling settings across replicas of the ``MusicCollection`` global table. ::

    aws dynamodb describe-table-replica-auto-scaling \
        --table-name MusicCollection

Output::

    {
        "TableAutoScalingDescription": {
            "TableName": "MusicCollection",
            "TableStatus": "ACTIVE",
            "Replicas": [
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
                        "MinimumUnits": 5,
                        "MaximumUnits": 40000,
                        "AutoScalingRoleArn": "arn:aws:iam::123456789012:role/aws-service-role/dynamodb.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_DynamoDBTable",
                        "ScalingPolicies": [
                            {
                                "PolicyName": "DynamoDBWriteCapacityUtilization:table/MusicCollection",
                                "TargetTrackingScalingPolicyConfiguration": {
                                    "TargetValue": 70.0
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
                        "MinimumUnits": 5,
                        "MaximumUnits": 40000,
                        "AutoScalingRoleArn": "arn:aws:iam::123456789012:role/aws-service-role/dynamodb.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_DynamoDBTable",
                        "ScalingPolicies": [
                            {
                                "PolicyName": "DynamoDBWriteCapacityUtilization:table/MusicCollection",
                                "TargetTrackingScalingPolicyConfiguration": {
                                    "TargetValue": 70.0
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
