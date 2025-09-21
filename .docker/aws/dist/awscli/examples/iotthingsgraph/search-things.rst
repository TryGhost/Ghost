**To search for things associated with devices and device models**

The following ``search-things`` example searches for all things that are associated with the HCSR501MotionSensor device. ::

    aws iotthingsgraph search-things \
        --entity-id "urn:tdm:aws/examples:Device:HCSR501MotionSensor"

Output::

    {
        "things": [
            {
                "thingArn": "arn:aws:iot:us-west-2:123456789012:thing/MotionSensor1",
                "thingName": "MotionSensor1"
            },
            {
                "thingArn": "arn:aws:iot:us-west-2:123456789012:thing/TG_MS",
                "thingName": "TG_MS"
            }
        ]
    }

For more information, see `Creating and Uploading Models <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-models-gs.html>`__ in the *AWS IoT Things Graph User Guide*.
