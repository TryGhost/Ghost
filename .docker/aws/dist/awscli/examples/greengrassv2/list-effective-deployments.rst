**To list deployment jobs**

The following ``list-effective-deployments`` example lists the deployments that apply to an AWS IoT Greengrass core device. ::

    aws greengrassv2 list-effective-deployments \
        --core-device-thing-name MyGreengrassCore

Output::

    {
        "effectiveDeployments": [
            {
                "deploymentId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "deploymentName": "Deployment for MyGreengrassCore",
                "iotJobId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "targetArn": "arn:aws:iot:us-west-2:123456789012:thing/MyGreengrassCore",
                "coreDeviceExecutionStatus": "COMPLETED",
                "reason": "SUCCESSFUL",
                "creationTimestamp": "2021-01-06T16:10:42.442000-08:00",
                "modifiedTimestamp": "2021-01-08T17:21:27.830000-08:00"
            },
            {
                "deploymentId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "deploymentName": "Deployment for MyGreengrassCoreGroup",
                "iotJobId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE44444",
                "iotJobArn": "arn:aws:iot:us-west-2:123456789012:job/a1b2c3d4-5678-90ab-cdef-EXAMPLE44444",
                "targetArn": "arn:aws:iot:us-west-2:123456789012:thinggroup/MyGreengrassCoreGroup",
                "coreDeviceExecutionStatus": "SUCCEEDED",
                "reason": "SUCCESSFUL",
                "creationTimestamp": "2021-01-07T17:19:20.394000-08:00",
                "modifiedTimestamp": "2021-01-07T17:21:20.721000-08:00"
            }
        ]
    }

For more information, see `Check core device status <https://docs.aws.amazon.com/greengrass/v2/developerguide/device-status.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.