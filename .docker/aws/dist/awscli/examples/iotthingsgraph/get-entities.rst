**To get definitions for entities**

The following ``get-entities`` example gets a definition for a device model. ::

    aws iotthingsgraph get-entities \
        --ids "urn:tdm:aws/examples:DeviceModel:MotionSensor"

Output::

    {
        "descriptions": [
            {
                "id": "urn:tdm:aws/examples:DeviceModel:MotionSensor",
                "type": "DEVICE_MODEL",
                "createdAt": 1559256190.599,
                "definition": {
                    "language": "GRAPHQL",
                    "text": "##\n# Specification of motion sensor devices interface.\n##\ntype MotionSensor @deviceModel(id: \"urn:tdm:aws/examples:deviceModel:MotionSensor\",\n        capability: \"urn:tdm:aws/examples:capability:MotionSensorCapability\") {ignore:void}"
                }
            }
        ]
    }

For more information, see `Creating and Uploading Models <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-models-gs.html>`__ in the *AWS IoT Things Graph User Guide*.
