**Wait until an ECS service becomes inactive**

The following ``service-inactive`` example waits until ECS services becomes inactive in the cluster. ::

    aws ecs wait services-inactive \
        --cluster MyCluster \
        --services MyService 

This command produces no output.
