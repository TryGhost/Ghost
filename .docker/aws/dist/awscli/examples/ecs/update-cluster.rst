**Example 1: Update ECS cluster enabling containerInsights**

The following ``update-cluster`` updates the containerInsights value to ``enabled`` in an already created cluster. By default, it is disabled. ::

    aws ecs update-cluster \
        --cluster ECS-project-update-cluster \
        --settings name=containerInsights,value=enabled

Output::

    "cluster": {
        "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/ECS-project-update-cluster",
        "clusterName": "ECS-project-update-cluster",
        "status": "ACTIVE",
        "registeredContainerInstancesCount": 0,
        "runningTasksCount": 0,
        "pendingTasksCount": 0,
        "activeServicesCount": 0,
        "statistics": [],
        "tags": [],
        "settings": [
            {
                "name": "containerInsights",
                "value": "enabled"
            }
        ],
        "capacityProviders": [
            "Infra-ECS-Cluster-ECS-project-update-cluster-d6bb6d5b-EC2CapacityProvider-3fIpdkLywwFt"
        ],
        "defaultCapacityProviderStrategy": [
            {
                "capacityProvider": "Infra-ECS-Cluster-ECS-project-update-cluster-d6bb6d5b-EC2CapacityProvider-3fIpdkLywwFt",
                "weight": 1,
                "base": 0
            }
        ],
        "attachments": [
            {
                "id": "069d002b-7634-42e4-b1d4-544f4c8f6380",
                "type": "as_policy",
                "status": "CREATED",
                "details": [
                    {
                        "name": "capacityProviderName",
                        "value": "Infra-ECS-Cluster-ECS-project-update-cluster-d6bb6d5b-EC2CapacityProvider-3fIpdkLywwFt"
                    },
                    {
                        "name": "scalingPolicyName",
                        "value": "ECSManagedAutoScalingPolicy-152363a6-8c65-484c-b721-42c3e070ae93"
                    }
                ]
            },
            {
                "id": "08b5b6ca-45e9-4209-a65d-e962a27c490a",
                "type": "managed_draining",
                "status": "CREATED",
                "details": [
                    {
                        "name": "capacityProviderName",
                        "value": "Infra-ECS-Cluster-ECS-project-update-cluster-d6bb6d5b-EC2CapacityProvider-3fIpdkLywwFt"
                    },
                    {
                        "name": "autoScalingLifecycleHookName",
                        "value": "ecs-managed-draining-termination-hook"
                    }
                ]
            },
            {
                "id": "45d0b36f-8cff-46b6-9380-1288744802ab",
                "type": "sc",
                "status": "ATTACHED",
                "details": []
            }
        ],
        "attachmentsStatus": "UPDATE_COMPLETE",
        "serviceConnectDefaults": {
            "namespace": "arn:aws:servicediscovery:us-west-2:123456789012:namespace/ns-igwrsylmy3kwvcdx"
        }
    }


**Example 2: Update ECS cluster to set a default Service Connect namspace**

The following ``update-cluster`` updates ECS cluster by setting a default Service Connect namespace. ::

    aws ecs update-cluster \
        --cluster ECS-project-update-cluster \
        --service-connect-defaults namespace=test

Output::

    {
        "cluster": {
            "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/ECS-project-update-cluster",
            "clusterName": "ECS-project-update-cluster",
            "status": "ACTIVE",
            "registeredContainerInstancesCount": 0,
            "runningTasksCount": 0,
            "pendingTasksCount": 0,
            "activeServicesCount": 0,
            "statistics": [],
            "tags": [],
            "settings": [
                {
                    "name": "containerInsights",
                    "value": "enabled"
                }
            ],
            "capacityProviders": [
                "Infra-ECS-Cluster-ECS-project-update-cluster-d6bb6d5b-EC2CapacityProvider-3fIpdkLywwFt"
            ],
            "defaultCapacityProviderStrategy": [
                {
                    "capacityProvider": "Infra-ECS-Cluster-ECS-project-update-cluster-d6bb6d5b-EC2CapacityProvider-3fIpdkLywwFt",
                    "weight": 1,
                    "base": 0
                }
            ],
            "attachments": [
                {
                    "id": "069d002b-7634-42e4-b1d4-544f4c8f6380",
                    "type": "as_policy",
                    "status": "CREATED",
                    "details": [
                        {
                            "name": "capacityProviderName",
                            "value": "Infra-ECS-Cluster-ECS-project-update-cluster-d6bb6d5b-EC2CapacityProvider-3fIpdkLywwFt"
                        },
                        {
                            "name": "scalingPolicyName",
                            "value": "ECSManagedAutoScalingPolicy-152363a6-8c65-484c-b721-42c3e070ae93"
                        }
                    ]
                },
                {
                    "id": "08b5b6ca-45e9-4209-a65d-e962a27c490a",
                    "type": "managed_draining",
                    "status": "CREATED",
                    "details": [
                        {
                            "name": "capacityProviderName",
                            "value": "Infra-ECS-Cluster-ECS-project-update-cluster-d6bb6d5b-EC2CapacityProvider-3fIpdkLywwFt"
                        },
                        {
                            "name": "autoScalingLifecycleHookName",
                            "value": "ecs-managed-draining-termination-hook"
                        }
                    ]
                },
                {
                    "id": "45d0b36f-8cff-46b6-9380-1288744802ab",
                    "type": "sc",
                    "status": "DELETED",
                    "details": []
                },
                {
                    "id": "3e6890c3-609c-4832-91de-d6ca891b3ef1",
                    "type": "sc",
                    "status": "ATTACHED",
                    "details": []
                },
                {
                    "id": "961b8ec1-c2f1-4070-8495-e669b7668e90",
                    "type": "sc",
                    "status": "DELETED",
                    "details": []
                }
            ],
            "attachmentsStatus": "UPDATE_COMPLETE",
            "serviceConnectDefaults": {
                "namespace": "arn:aws:servicediscovery:us-west-2:123456789012:namespace/ns-dtjmxqpfi46ht7dr"
            }
        }
   }
   
For more information on Service Connect, see `Use Service Connect to connect Amazon ECS services with short names <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html>`__ in the *Amazon ECS Developer Guide*.
