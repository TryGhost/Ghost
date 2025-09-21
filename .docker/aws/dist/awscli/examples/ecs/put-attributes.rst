**To create an attribute and associate it with an Amazon ECS resource**

The following ``put-attributes`` applies an attribute with the name stack and the value production to a container instance. ::

    aws ecs put-attributes \
        --attributes name=stack,value=production,targetId=arn:aws:ecs:us-west-2:130757420319:container-instance/1c3be8ed-df30-47b4-8f1e-6e68ebd01f34
        
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
