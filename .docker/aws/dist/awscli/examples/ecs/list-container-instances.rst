**To list the container instances in a cluster**

The following ``list-container-instances`` example lists all of the available container instances in a cluster. ::

    aws ecs list-container-instances --cluster MyCluster

Output::

    {
        "containerInstanceArns": [
            "arn:aws:ecs:us-west-2:123456789012:container-instance/MyCluster/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
            "arn:aws:ecs:us-west-2:123456789012:container-instance/MyCluster/a1b2c3d4-5678-90ab-cdef-22222EXAMPLE"
        ]
    }

For more information, see `Amazon ECS Container Instances <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_instances.html>`_ in the *Amazon ECS Developer Guide*.
