**To update the container agent on an Amazon ECS container instance**

The following ``update-container-agent`` example updates the container agent on the specified container instance in the default cluster. ::

    aws ecs update-container-agent --cluster default --container-instance a1b2c3d4-5678-90ab-cdef-11111EXAMPLE

Output::

    {
        "containerInstance": {
            "status": "ACTIVE",
    ...
            "agentUpdateStatus": "PENDING",
            "versionInfo": {
                "agentVersion": "1.0.0",
                "agentHash": "4023248",
                "dockerVersion": "DockerVersion: 1.5.0"
            }
        }
    }

For more information, see `Updating the Amazon ECS Container Agent <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-update.html>`_ in the *Amazon ECS Developer Guide*.
