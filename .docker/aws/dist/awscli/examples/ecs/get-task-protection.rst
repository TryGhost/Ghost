**Retrieve the protection status of task in ECS service**

The following ``get-task-protection`` provides the protection status of ECS tasks that belong to Amazon ECS service. ::

    aws ecs get-task-protection \
        --cluster ECS-project-update-cluster \
        --tasks c43ed3b1331041f289316f958adb6a24

Output::

    {
        "protectedTasks": [
            {
                "taskArn": "arn:aws:ecs:us-west-2:123456789012:task/c43ed3b1331041f289316f958adb6a24",
                "protectionEnabled": false
            }
        ],
        "failures": []
    }

For more formation on task protection, see `Protect your Amazon ECS tasks from being terminated by scale-in events <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-scale-in-protection.html>`__ in the *Amazon ECS Developer Guide*.
