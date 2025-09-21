**To create a system**

The following ``create-system-template`` example creates a system. The value of MySystemDefinition is the GraphQL that models the system. ::

    aws iotthingsgraph create-system-template \
        --definition language=GRAPHQL,text="MySystemDefinition"

Output::

    {
        "summary": {
            "createdAt": 1559249776.254,
            "id": "urn:tdm:us-west-2/123456789012/default:System:MySystem",
            "arn": "arn:aws:iotthingsgraph:us-west-2:123456789012:System/default/MySystem",
            "revisionNumber": 1
        }
    }

For more information, see `Creating Systems <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-sysdeploy-systems.html>`__ in the *AWS IoT Things Graph User Guide*.
