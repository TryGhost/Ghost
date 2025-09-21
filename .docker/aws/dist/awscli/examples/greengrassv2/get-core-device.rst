**To get a core device**

The following ``get-core-device`` example gets information about an AWS IoT Greengrass core device. ::

    aws greengrassv2 get-core-device \
        --core-device-thing-name MyGreengrassCore

Output::

    {
        "coreDeviceThingName": "MyGreengrassCore",
        "coreVersion": "2.0.3",
        "platform": "linux",
        "architecture": "amd64",
        "status": "HEALTHY",
        "lastStatusUpdateTimestamp": "2021-01-08T04:57:58.838000-08:00",
        "tags": {}
    }

For more information, see `Check core device status <https://docs.aws.amazon.com/greengrass/v2/developerguide/device-status.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.