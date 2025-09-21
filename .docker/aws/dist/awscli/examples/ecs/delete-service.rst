**To delete a service**

The following ``ecs delete-service`` example deletes the specified service from a cluster. You can include the ``--force`` parameter to delete a service even if it has not been scaled to zero tasks. ::

    aws ecs delete-service --cluster MyCluster --service MyService1 --force

For more information, see `Deleting a Service <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/delete-service.html>`_ in the *Amazon ECS Developer Guide*.