**To get a deployment**

The following ``get-deployment`` example gets information about the deployment of the AWS IoT Greengrass nucleus component to a group of core devices. ::

    aws greengrassv2 get-deployment \
        --deployment-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "targetArn": "arn:aws:iot:us-west-2:123456789012:thinggroup/MyGreengrassCoreGroup",
        "revisionId": "14",
        "deploymentId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "deploymentName": "Deployment for MyGreengrassCoreGroup",
        "deploymentStatus": "ACTIVE",
        "iotJobId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
        "iotJobArn": "arn:aws:iot:us-west-2:123456789012:job/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
        "components": {
            "aws.greengrass.Nucleus": {
                "componentVersion": "2.0.3",
                "configurationUpdate": {
                    "merge": "{\"jvmOptions\":\"-Xmx64m\",\"logging\":{\"level\":\"WARN\"}}",
                    "reset": [
                        "/networkProxy",
                        "/mqtt"
                    ]
                }
            }
        },
        "deploymentPolicies": {
            "failureHandlingPolicy": "ROLLBACK",
            "componentUpdatePolicy": {
                "timeoutInSeconds": 60,
                "action": "NOTIFY_COMPONENTS"
            },
            "configurationValidationPolicy": {
                "timeoutInSeconds": 60
            }
        },
        "iotJobConfiguration": {},
        "creationTimestamp": "2021-01-07T17:21:20.691000-08:00",
        "isLatestForTarget": false,
        "tags": {}
    }

For more information, see `Deploy components to devices <https://docs.aws.amazon.com/greengrass/v2/developerguide/manage-deployments.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.