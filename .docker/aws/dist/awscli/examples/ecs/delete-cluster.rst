**To delete an empty cluster**

The following ``delete-cluster`` example deletes the specified empty cluster. ::

    aws ecs delete-cluster --cluster MyCluster

Output::

    {
        "cluster": {
            "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/MyCluster",
            "status": "INACTIVE",
            "clusterName": "MyCluster",
            "registeredContainerInstancesCount": 0,
            "pendingTasksCount": 0,
            "runningTasksCount": 0,
            "activeServicesCount": 0
            "statistics": [],
            "tags": []
        }
    }

For more information, see `Deleting a Cluster <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/delete_cluster.html>`_ in the *Amazon ECS Developer Guide*.