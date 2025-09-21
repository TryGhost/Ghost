**To update an input**

The following ``update-input`` example updates the specified input with a new description and definition. ::

    aws iotevents update-input \
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
            "lastUpdateTime": 1560795976.458, 
            "creationTime": 1560795312.542, 
            "inputName": "PressureInput", 
            "inputDescription": "Pressure readings from a motor"
        }
    }

For more information, see `UpdateInput <https://docs.aws.amazon.com/iotevents/latest/apireference/API_UpdateInput>`__ in the *AWS IoT Events API Reference*.
