**To list components installed on a core device**

The following ``list-installed-components`` example lists the components that are installed on an AWS IoT Greengrass core device. ::

    aws greengrassv2 list-installed-components \
        --core-device-thing-name MyGreengrassCore

Output::

    {
        "installedComponents": [
            {
                "componentName": "aws.greengrass.Cli",
                "componentVersion": "2.0.3",
                "lifecycleState": "RUNNING",
                "isRoot": true
            },
            {
                "componentName": "aws.greengrass.Nucleus",
                "componentVersion": "2.0.3",
                "lifecycleState": "FINISHED",
                "isRoot": true
            }
        ]
    }

For more information, see `Check core device status <https://docs.aws.amazon.com/greengrass/v2/developerguide/device-status.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.