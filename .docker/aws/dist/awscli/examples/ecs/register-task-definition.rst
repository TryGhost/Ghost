**Example 1: To register a task definition with a JSON file**

The following ``register-task-definition`` example registers a task definition to the specified family. The container definitions are saved in JSON format at the specified file location. ::

    aws ecs register-task-definition \
        --cli-input-json file://<path_to_json_file>/sleep360.json

Contents of ``sleep360.json``::

    {
        "containerDefinitions": [
            {
                "name": "sleep",
                "image": "busybox",
                "cpu": 10,
                "command": [
                    "sleep",
                    "360"
                ],
                "memory": 10,
                "essential": true
            }
        ],
        "family": "sleep360"
    }

Output::

    {
        "taskDefinition": {
            "status": "ACTIVE", 
            "family": "sleep360", 
            "placementConstraints": [], 
            "compatibilities": [
                    "EXTERNAL", 
                    "EC2"
            ], 
            "volumes": [], 
            "taskDefinitionArn": "arn:aws:ecs:us-east-1:123456789012:task-definition/sleep360:1", 
            "containerDefinitions": [
                {
                    "environment": [], 
                    "name": "sleep", 
                    "mountPoints": [], 
                    "image": "busybox", 
                    "cpu": 10, 
                    "portMappings": [], 
                    "command": [
                        "sleep", 
                        "360"
                    ], 
            "memory": 10, 
            "essential": true, 
            "volumesFrom": []
            }
        ], 
            "revision": 1
        }
    }

For more information, see `Example task definitions <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/example_task_definitions.html>`_ in the *Amazon ECS Developer Guide*.

**Example 2: To register a task definition with a JSON string parameter**

The following ``register-task-definition`` example registers a task definition using container definitions provided as a JSON string parameter with escaped double quotes. ::

    aws ecs register-task-definition \
        --family sleep360 \
        --container-definitions "[{\"name\":\"sleep\",\"image\":\"busybox\",\"cpu\":10,\"command\":[\"sleep\",\"360\"],\"memory\":10,\"essential\":true}]"

The output is identical to the previous example.

For more information, see `Creating a Task Definition <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-task-definition.html>`_ in the *Amazon ECS Developer Guide*.