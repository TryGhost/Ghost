**To get a system**

The following ``get-system-template`` example gets a definition for a system. ::

    aws iotthingsgraph get-system-template \
        --id "urn:tdm:us-west-2/123456789012/default:System:MySystem"

Output::

    {
        "description": {
            "summary": {
                "id": "urn:tdm:us-west-2/123456789012/default:System:MySystem",
                "arn": "arn:aws:iotthingsgraph:us-west-2:123456789012:System/default/MyFlow",
                "revisionNumber": 1,
                "createdAt": 1559247540.656
            },
            "definition": {
                "language": "GRAPHQL",
                "text": "{\ntype MySystem @systemType(id: \"urn:tdm:us-west-2/123456789012/default:System:MySystem\", description: \"\") {\n  camera: Camera @thing(id: \"urn:tdm:aws/examples:deviceModel:Camera\")\n  screen: Screen @thing(id: \"urn:tdm:aws/examples:deviceModel:Screen\")\n  motionSensor: MotionSensor @thing(id: \"urn:tdm:aws/examples:deviceModel:MotionSensor\")\n  MyFlow: MyFlow @workflow(id: \"urn:tdm:us-west-2/123456789012/default:Workflow:MyFlow\")\n}\n}"
            },
            "validatedNamespaceVersion": 5
        }
    }

For more information, see `Working with Systems and Flow Configurations <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-sysdeploy.html>`__ in the *AWS IoT Things Graph User Guide*.
