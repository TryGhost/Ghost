**Example 1: Enable task protection for ECS tasks**

The following ``update-task-protection`` protects your ECS task from termination during scale-in from Deployments or Service AutoScaling. You can specify custom expiration period for task protection from 1 up to 2,880 minutes (48 hours). If you do not specify expiration period, enabling task protection default time is 2 hours. ::

    aws ecs update-task-protection \
        --cluster ECS-project-update-cluster \
        --tasks c43ed3b1331041f289316f958adb6a24 \
        --protection-enabled \
        --expires-in-minutes 300

Output::

    {
    "protectedTasks": [
        {
            "taskArn": "arn:aws:ecs:us-west-2:123456789012:task/c43ed3b1331041f289316f958adb6a24",
            "protectionEnabled": true,
            "expirationDate": "2024-09-14T19:53:36.687000-05:00"
        }
    ],
    "failures": []
    }

**Example 2: Disable task protection for ECS tasks**

The following ``update-task-protection`` disables the tasks protected from scale in from Deployments or Service AutoScaling. ::

    aws ecs update-task-protection \
        --cluster ECS-project-update-cluster \
        --tasks c43ed3b1331041f289316f958adb6a24 \
        --no-protection-enabled

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

