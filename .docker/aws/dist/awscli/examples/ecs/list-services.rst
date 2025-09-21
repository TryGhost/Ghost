**To list the services in a cluster**

The following ``list-services`` example shows how to list the services running in a cluster. ::

    aws ecs list-services --cluster MyCluster
  
Output::

    {
        "serviceArns": [
            "arn:aws:ecs:us-west-2:123456789012:service/MyCluster/MyService"
        ]
   }

For more information, see `Services <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html>`_ in the *Amazon ECS Developer Guide*.
