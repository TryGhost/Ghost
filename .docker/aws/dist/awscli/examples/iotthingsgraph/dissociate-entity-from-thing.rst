**To dissociate a thing from a device**

The following ``dissociate-entity-from-thing`` example dissociates a thing from a device. ::

    aws iotthingsgraph dissociate-entity-from-thing \
        --thing-name "MotionSensorName" \
        --entity-type "DEVICE"

This command produces no output.

For more information, see `Creating and Uploading Models <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-models-gs.html>`__ in the *AWS IoT Things Graph User Guide*.
