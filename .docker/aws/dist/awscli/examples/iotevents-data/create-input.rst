**To create an input**

The following ``create-input`` example creates an input. ::

    aws iotevents create-input \
        --cli-input-json file://pressureInput.json

Contents of ``pressureInput.json``::

    {
        "inputName": "PressureInput",
        "inputDescription": "Pressure readings from a motor",
        "inputDefinition": {
            "attributes": [
                    { "jsonPath": "sensorData.pressure" },
                    { "jsonPath": "motorid" }
                ]
        }
    }

Output::

    {
        "inputConfiguration": {
            "status": "ACTIVE", 
            "inputArn": "arn:aws:iotevents:us-west-2:123456789012:input/PressureInput", 
            "lastUpdateTime": 1560795312.542, 
            "creationTime": 1560795312.542, 
            "inputName": "PressureInput", 
            "inputDescription": "Pressure readings from a motor"
        }
    }

For more information, see `CreateInput <https://docs.aws.amazon.com/iotevents/latest/developerguide/iotevents-commands.html#api-iotevents-CreateInput>`__ in the *AWS IoT Events Developer Guide**.
