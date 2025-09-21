**Example 1: To describe a cluster**

The following ``describe-clusters`` example retrieves details about the specified cluster. ::

    aws ecs describe-clusters \
        --cluster default

Output::

    {
        "clusters": [
            {
                "status": "ACTIVE",
                "clusterName": "default",
                "registeredContainerInstancesCount": 0,
                "pendingTasksCount": 0,
                "runningTasksCount": 0,
                "activeServicesCount": 1,
                "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/default"
            }
        ],
        "failures": []
    }

For more information, see `Amazon ECS Clusters <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_clusters.html>`__ in the *Amazon ECS Developer Guide*.

**Example 2: To describe a cluster with the attachment option**

The following ``describe-clusters`` example specifies the ATTACHMENTS option. It retrieves details about the specified cluster and a list of resources attached to the cluster in the form of attachments. When using a capacity provider with a cluster, the resources, either AutoScaling plans or scaling policies, will be represented as asp or as_policy ATTACHMENTS. ::

    aws ecs describe-clusters \
        --include ATTACHMENTS \
        --clusters sampleCluster

Output::

    {
        "clusters": [
            {
                "clusterArn": "arn:aws:ecs:af-south-1:123456789222:cluster/sampleCluster",
                "clusterName": "sampleCluster",
                "status": "ACTIVE",
                "registeredContainerInstancesCount": 0,
                "runningTasksCount": 0,
                "pendingTasksCount": 0,
                "activeServicesCount": 0,
                "statistics": [],
                "tags": [],
                "settings": [],
                "capacityProviders": [
                    "sampleCapacityProvider"
                ],
                "defaultCapacityProviderStrategy": [],
                "attachments": [
                    {
                        "id": "a1b2c3d4-5678-901b-cdef-EXAMPLE22222",
                        "type": "as_policy",
                        "status": "CREATED",
                        "details": [
                            {
                                "name": "capacityProviderName",
                                "value": "sampleCapacityProvider"
                            },
                            {
                                "name": "scalingPolicyName",
                                "value": "ECSManagedAutoScalingPolicy-3048e262-fe39-4eaf-826d-6f975d303188"
                            }
                        ]
                    }
                ],
                "attachmentsStatus": "UPDATE_COMPLETE"
            }
        ],
        "failures": []
    }

For more information, see `Amazon ECS Clusters <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_clusters.html>`__ in the *Amazon ECS Developer Guide*.