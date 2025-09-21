**To list the client devices associated with a core device**

The following ``list-client-devices-associated-with-core-device`` example lists all client devices associated with a core device. ::

    aws greengrassv2 list-client-devices-associated-with-core-device \
      --core-device-thing-name MyTestGreengrassCore

Output::

    {
        "associatedClientDevices": [
            {
                "thingName": "MyClientDevice2",
                "associationTimestamp": "2021-07-12T16:33:55.843000-07:00"
            },
            {
                "thingName": "MyClientDevice1",
                "associationTimestamp": "2021-07-12T16:33:55.843000-07:00"
            }
        ]
    }

For more information, see `Interact with local IoT devices <https://docs.aws.amazon.com/greengrass/v2/developerguide/interact-with-local-iot-devices.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.