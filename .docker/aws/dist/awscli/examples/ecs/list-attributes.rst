**To list the container instances that contain a specific attribute**

The following example lists the attributes for container instances that have the ``stack=production`` attribute in the default cluster. ::

    aws ecs list-attributes \
        --target-type container-instance \
        --attribute-name stack \
        --attribute-value production \
        --cluster default

Output::

    {
        "attributes": [
            {
                "name": "stack",
                "targetId": "arn:aws:ecs:us-west-2:130757420319:container-instance/1c3be8ed-df30-47b4-8f1e-6e68ebd01f34",
                "value": "production"
            }
        ]
    }

For more information, see `Amazon ECS Container Agent Configuration <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-config.html>`__ in the *Amazon ECS Developer Guide*.
