**Example 1: To pause running until a service is confirmed to be stable**

The following ``wait`` example pauses and continues only after it can confirm that the specified service running on the specified cluster is stable. There is no output. ::

    aws ecs wait services-stable \
        --cluster MyCluster \
        --services MyService

**Example 2: To pause running until a task is confirmed to be running**

The following ``wait`` example pauses and continues only after the specified task enters a ``RUNNING`` state. ::

    aws ecs wait services-stable \
        --cluster MyCluster \
        --tasks arn:aws:ecs:us-west-2:123456789012:task/a1b2c3d4-5678-90ab-cdef-44444EXAMPLE