**To associate a thing with a device**

The following ``associate-entity-to-thing`` example associates a thing with a device. The example uses a motion sensor device that is in the public namespace. ::

    aws iotthingsgraph associate-entity-to-thing \
        --thing-name "MotionSensorName" \
        --entity-id "urn:tdm:aws/examples:Device:HCSR501MotionSensor"

This command produces no output.

For more information, see `Creating and Uploading Models <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-models-gs.html>`__ in the *AWS IoT Things Graph User Guide*.
