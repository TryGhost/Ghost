**To modify the settings for your cluster**

The following ``update-cluster-settings`` example enables CloudWatch Container Insights with enhanced observability for the ``MyCluster`` cluster. ::

    aws ecs update-cluster-settings \
        --cluster MyCluster \
        --settings name=containerInsights,value=enhanced

Output::

    {
        "cluster": {
            "clusterArn": "arn:aws:ecs:us-esat-1:123456789012:cluster/MyCluster",
            "clusterName": "default",
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
                    "value": "enhanced"
                }
            ]
        }
    }

For more information, see `Modifying Account Settings <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-modifying-longer-id-settings.html>`__ in the *Amazon ECS Developer Guide*.
