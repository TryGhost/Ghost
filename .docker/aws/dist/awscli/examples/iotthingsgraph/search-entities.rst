**To search for entities**

The following ``search-entities`` example searches for all entities of type ``EVENT``. ::

    aws iotthingsgraph search-entities \
        --entity-types "EVENT"

Output::

    {
        "descriptions": [
            {
                "id": "urn:tdm:aws/examples:Event:MotionSensorEvent",
                "type": "EVENT",
                "definition": {
                    "language": "GRAPHQL",
                    "text": "##\n# Description of events emitted by motion sensor.\n##\ntype MotionSensorEvent @eventType(id: \"urn:tdm:aws/examples:event:MotionSensorEvent\",\n            payload: \"urn:tdm:aws/examples:property:MotionSensorStateProperty\") {ignore:void}"
                }
            },
            {
                "id": "urn:tdm:us-west-2/123456789012/default:Event:CameraClickedEventV2",
                "type": "EVENT",
                "definition": {
                    "language": "GRAPHQL",
                    "text": "type CameraClickedEventV2 @eventType(id: \"urn:tdm:us-west-2/123456789012/default:event:CameraClickedEventV2\",\r\npayload: \"urn:tdm:aws:Property:Boolean\"){ignore:void}"
                }
            },
            {
                "id": "urn:tdm:us-west-2/123456789012/default:Event:MotionSensorEventV2",
                "type": "EVENT",
                "definition": {
                    "language": "GRAPHQL",
                    "text": "# Event emitted by the motion sensor.\r\ntype MotionSensorEventV2 @eventType(id: \"urn:tdm:us-west-2/123456789012/default:event:MotionSensorEventV2\",\r\npayload: \"urn:tdm:us-west-2/123456789012/default:property:MotionSensorStateProperty2\") {ignore:void}"
                }
            }
        ],
        "nextToken": "urn:tdm:us-west-2/123456789012/default:Event:MotionSensorEventV2"
    }

For more information, see `AWS IoT Things Graph Data Model Reference <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-models.html>`__ in the *AWS IoT Things Graph User Guide*.
