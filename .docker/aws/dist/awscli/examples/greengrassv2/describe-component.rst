**To describe a component version**

The following ``describe-component`` example describes a Hello World component. ::

    aws greengrassv2 describe-component \
        --arn arn:aws:greengrass:us-west-2:123456789012:components:com.example.HelloWorld:versions:1.0.0

Output::

    {
        "arn": "arn:aws:greengrass:us-west-2:123456789012:components:com.example.HelloWorld:versions:1.0.0",
        "componentName": "com.example.HelloWorld",
        "componentVersion": "1.0.0",
        "creationTimestamp": "2021-01-07T17:12:11.133000-08:00",
        "publisher": "Amazon",
        "description": "My first AWS IoT Greengrass component.",
        "status": {
            "componentState": "DEPLOYABLE",
            "message": "NONE",
            "errors": {}
        },
        "platforms": [
            {
                "attributes": {
                    "os": "linux"
                }
            }
        ]
    }

For more information, see `Manage components <https://docs.aws.amazon.com/greengrass/v2/developerguide/manage-components.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.