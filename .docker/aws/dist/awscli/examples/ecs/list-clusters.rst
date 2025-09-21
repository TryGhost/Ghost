**To list your available clusters**

The following ``list-clusters`` example lists all of the available clusters. ::

    aws ecs list-clusters

Output::

    {
        "clusterArns": [
            "arn:aws:ecs:us-west-2:123456789012:cluster/MyECSCluster1",
            "arn:aws:ecs:us-west-2:123456789012:cluster/AnotherECSCluster"
        ]
    }

For more information, see `Amazon ECS Clusters <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_clusters.html>`_ in the *Amazon ECS Developer Guide*.
