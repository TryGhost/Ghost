**Example 1: To create a deployment**

The following ``create-deployment`` example deploys the AWS IoT Greengrass Command Line Interface to a core device. ::

    aws greengrassv2 create-deployment \
        --cli-input-json file://cli-deployment.json

Contents of ``cli-deployment.json``::

    {
        "targetArn": "arn:aws:iot:us-west-2:123456789012:thing/MyGreengrassCore",
        "deploymentName": "Deployment for MyGreengrassCore",
        "components": {
            "aws.greengrass.Cli": {
                "componentVersion": "2.0.3"
            }
        },
        "deploymentPolicies": {
            "failureHandlingPolicy": "DO_NOTHING",
            "componentUpdatePolicy": {
                "timeoutInSeconds": 60,
                "action": "NOTIFY_COMPONENTS"
            },
            "configurationValidationPolicy": {
                "timeoutInSeconds": 60
            }
        },
        "iotJobConfiguration": {}
    }

Output::

    {
        "deploymentId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
    }

For more information, see `Create deployments <https://docs.aws.amazon.com/greengrass/v2/developerguide/create-deployments.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.

**Example 2: To create a deployment that updates component configurations**

The following ``create-deployment`` example deploys the AWS IoT Greengrass nucleus component to a group of core devices. This deployment applies the following configuration updates for the nucleus component:

- Reset the target devices' proxy settings to their default no proxy settings.
- Reset the target devices' MQTT settings to their defaults.
- Sets the JVM options for the nucleus' JVM.
- Sets the logging level for the nucleus.

::

    aws greengrassv2 create-deployment \
        --cli-input-json file://nucleus-deployment.json

Contents of ``nucleus-deployment.json``::

    {
        "targetArn": "arn:aws:iot:us-west-2:123456789012:thinggroup/MyGreengrassCoreGroup",
        "deploymentName": "Deployment for MyGreengrassCoreGroup",
        "components": {
            "aws.greengrass.Nucleus": {
                "componentVersion": "2.0.3",
                "configurationUpdate": {
                    "reset": [
                        "/networkProxy",
                        "/mqtt"
                    ],
                    "merge": "{\"jvmOptions\":\"-Xmx64m\",\"logging\":{\"level\":\"WARN\"}}"
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
        "iotJobConfiguration": {}
    }

Output::

    {
        "deploymentId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "iotJobId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
        "iotJobArn": "arn:aws:iot:us-west-2:123456789012:job/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222"
    }

For more information, see `Create deployments <https://docs.aws.amazon.com/greengrass/v2/developerguide/create-deployments.html>`__ and `Update component configurations <https://docs.aws.amazon.com/greengrass/v2/developerguide/update-component-configurations.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.