**To run an interactive /bin/sh command**

The following ``execute-command`` example runs an interactive /bin/sh command against a container named MyContainer for a task with an id of ``arn:aws:ecs:us-east-1:123456789012:task/MyCluster/d789e94343414c25b9f6bd59eEXAMPLE``. ::

    aws ecs execute-command \
        --cluster MyCluster \
        --task arn:aws:ecs:us-east-1:123456789012:task/MyCluster/d789e94343414c25b9f6bd59eEXAMPLE \
        --container MyContainer \
        --interactive \
        --command "/bin/sh"

This command produces no output.

For more information, see `Using Amazon ECS Exec for debugging <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html>`__ in the *Amazon ECS Developer Guide*.
