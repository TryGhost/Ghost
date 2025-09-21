**Example 1: To create a thing record in the registry**

The following ``create-thing`` example creates an entry for a device in the AWS IoT thing registry. ::

    aws iot create-thing \
        --thing-name SampleIoTThing

Output::

    {
        "thingName": "SampleIoTThing",
        "thingArn": "arn:aws:iot:us-west-2: 123456789012:thing/SampleIoTThing",
        "thingId": " EXAMPLE1-90ab-cdef-fedc-ba987EXAMPLE "
    }

**Example 2: To define a thing that is associated with a thing type**

The following ``create-thing`` example create a thing that has the specified thing type and its attributes. ::

    aws iot create-thing \
        --thing-name "MyLightBulb" \
        --thing-type-name "LightBulb" \
        --attribute-payload "{"attributes": {"wattage":"75", "model":"123"}}"

Output::

    {
        "thingName": "MyLightBulb",
        "thingArn": "arn:aws:iot:us-west-2:123456789012:thing/MyLightBulb",
        "thingId": "40da2e73-c6af-406e-b415-15acae538797"
    }

For more information, see `How to Manage Things with the Registry <https://docs.aws.amazon.com/iot/latest/developerguide/thing-registry.html>`__ and `Thing Types <https://docs.aws.amazon.com/iot/latest/developerguide/thing-types.html>`__ in the *AWS IoT Developers Guide*.
