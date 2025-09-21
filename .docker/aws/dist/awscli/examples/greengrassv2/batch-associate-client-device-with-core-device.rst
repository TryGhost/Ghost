**To associate client devices with a core device**

The following ``batch-associate-client-device-with-core-device`` example associates two client devices with a core device. ::

    aws greengrassv2 batch-associate-client-device-with-core-device \
      --core-device-thing-name MyGreengrassCore \
      --entries thingName=MyClientDevice1 thingName=MyClientDevice2

Output::

    {
        "errorEntries": []
    }

For more information, see `Interact with local IoT devices <https://docs.aws.amazon.com/greengrass/v2/developerguide/interact-with-local-iot-devices.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.