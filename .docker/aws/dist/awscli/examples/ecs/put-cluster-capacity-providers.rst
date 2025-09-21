**Example 1: To add an existing capacity provider to a cluster**

The following ``put-cluster-capacity-providers`` example adds an existing capacity provider to a cluster. The ``create-capacity-provider`` command is used to create a capacity provider. The ``describe-clusters`` command is used to describe the current capacity providers and the default capacity provider strategy associated with a cluster. When adding a new capacity provider to a cluster, you must specify all existing capacity providers in addition to the new capacity provider you want to associate with the cluster. You must also specify the default capacity provider strategy to associate with the cluster. In this example, the ``MyCluster`` cluster has the ``MyCapacityProvider1`` capacity provider associated with it and you want to add the ``MyCapacityProvider2`` capacity provider and include it in the default capacity provider strategy so tasks are spread evenly across both capacity providers. ::

    aws ecs put-cluster-capacity-providers \
        --cluster MyCluster \
        --capacity-providers MyCapacityProvider1 MyCapacityProvider2 \
        --default-capacity-provider-strategy capacityProvider=MyCapacityProvider1,weight=1 capacityProvider=MyCapacityProvider2,weight=1

Output::

    {
        "cluster": {
            "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/MyCluster",
            "clusterName": "MyCluster",
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
                "MyCapacityProvider1",
                "MyCapacityProvider2"
            ],
            "defaultCapacityProviderStrategy": [
                {
                    "capacityProvider": "MyCapacityProvider1",
                    "weight": 1,
                    "base": 0
                },
                {
                    "capacityProvider": "MyCapacityProvider2",
                    "weight": 1,
                    "base": 0
                }
            ],
            "attachments": [
               {
                    "id": "0fb0c8f4-6edd-4de1-9b09-17e470ee1918",
                    "type": "as_policy",
                    "status": "ACTIVE",
                    "details": [
                        {
                            "name": "capacityProviderName",
                            "value": "MyCapacityProvider1"
                        },
                        {
                            "name": "scalingPolicyName",
                            "value": "ECSManagedAutoScalingPolicy-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
                        }
                    ]
                },
                {
                    "id": "ae592060-2382-4663-9476-b015c685593c",
                    "type": "as_policy",
                    "status": "ACTIVE",
                    "details": [
                        {
                            "name": "capacityProviderName",
                            "value": "MyCapacityProvider2"
                        },
                        {
                            "name": "scalingPolicyName",
                            "value": "ECSManagedAutoScalingPolicy-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222"
                        }
                    ]
                }
            ],
            "attachmentsStatus": "UPDATE_IN_PROGRESS"
        }
    }

For more information, see `Cluster capacity providers <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-capacity-providers.html>`__ in the *Amazon ECS Developer Guide*.

**Example 2: To remove a capacity provider from a cluster**

The following ``put-cluster-capacity-providers`` example removes a capacity provider from a cluster. The ``describe-clusters`` command is used to describe the current capacity providers associated with a cluster. When removing a capacity provider from a cluster, you must specify the capacity providers you want to remain associated with the cluster as well as the default capacity provider strategy to associate with the cluster. In this example, the cluster has the ``MyCapacityProvider1`` and ``MyCapacityProvider2`` capacity providers associated with it and you want to remove the ``MyCapacityProvider2`` capacity provider, so you specify only ``MyCapacityProvider1`` in the command along with the updated default capacity provider strategy. ::

    aws ecs put-cluster-capacity-providers \
        --cluster MyCluster \
        --capacity-providers MyCapacityProvider1 \
        --default-capacity-provider-strategy capacityProvider=MyCapacityProvider1,weight=1,base=0

Output::

    {
        "cluster": {
            "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/MyCluster",
            "clusterName": "MyCluster",
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
                "MyCapacityProvider1"
            ],
            "defaultCapacityProviderStrategy": [
                "capacityProvider": "MyCapacityProvider1",
                "weight": 1,
                "base": 0
            ],
            "attachments": [
               {
                    "id": "0fb0c8f4-6edd-4de1-9b09-17e470ee1918",
                    "type": "as_policy",
                    "status": "ACTIVE",
                    "details": [
                        {
                            "name": "capacityProviderName",
                            "value": "MyCapacityProvider1"
                        },
                        {
                            "name": "scalingPolicyName",
                            "value": "ECSManagedAutoScalingPolicy-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
                        }
                    ]
                },
                {
                    "id": "ae592060-2382-4663-9476-b015c685593c",
                    "type": "as_policy",
                    "status": "DELETING",
                    "details": [
                        {
                            "name": "capacityProviderName",
                            "value": "MyCapacityProvider2"
                        },
                        {
                            "name": "scalingPolicyName",
                            "value": "ECSManagedAutoScalingPolicy-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222"
                        }
                    ]
                }
            ],
            "attachmentsStatus": "UPDATE_IN_PROGRESS"
        }
    }

For more information, see `Cluster capacity providers <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-capacity-providers.html>`__ in the *Amazon ECS Developer Guide*.

**Example 3: To remove all capacity providers from a cluster**

The following ``put-cluster-capacity-providers`` example removes all existing capacity providers from the cluster. ::

    aws ecs put-cluster-capacity-providers \
        --cluster MyCluster \
        --capacity-providers [] \
        --default-capacity-provider-strategy []

Output::

    {
        "cluster": {
            "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/MyCluster",
            "clusterName": "MyCluster",
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
            "capacityProviders": [],
            "defaultCapacityProviderStrategy": [],
            "attachments": [
               {
                    "id": "0fb0c8f4-6edd-4de1-9b09-17e470ee1918",
                    "type": "as_policy",
                    "status": "DELETING",
                    "details": [
                        {
                            "name": "capacityProviderName",
                            "value": "MyCapacityProvider1"
                        },
                        {
                            "name": "scalingPolicyName",
                            "value": "ECSManagedAutoScalingPolicy-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
                        }
                    ]
                },
                {
                    "id": "ae592060-2382-4663-9476-b015c685593c",
                    "type": "as_policy",
                    "status": "DELETING",
                    "details": [
                        {
                            "name": "capacityProviderName",
                            "value": "MyCapacityProvider2"
                        },
                        {
                            "name": "scalingPolicyName",
                            "value": "ECSManagedAutoScalingPolicy-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222"
                        }
                    ]
                }
            ],
            "attachmentsStatus": "UPDATE_IN_PROGRESS"
        }
    }

For more information, see `Cluster capacity providers <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-capacity-providers.html>`__ in the *Amazon ECS Developer Guide*.