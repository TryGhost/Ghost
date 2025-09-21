**To list core devices**

The following ``list-core-devices`` example lists the AWS IoT Greengrass core devices in your AWS account in the current Region. ::

    aws greengrassv2 list-core-devices

Output::

    {
        "coreDevices": [
            {
                "coreDeviceThingName": "MyGreengrassCore",
                "status": "HEALTHY",
                "lastStatusUpdateTimestamp": "2021-01-08T04:57:58.838000-08:00"
            }
        ]
    }

For more information, see `Check core device status <https://docs.aws.amazon.com/greengrass/v2/developerguide/device-status.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.