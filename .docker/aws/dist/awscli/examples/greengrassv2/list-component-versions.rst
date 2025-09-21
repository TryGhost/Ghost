**To list the versions of a component**

The following ``list-component-versions`` example lists all versions of a Hello World component. ::

    aws greengrassv2 list-component-versions \
        --arn arn:aws:greengrass:us-west-2:123456789012:components:com.example.HelloWorld

Output::

    {
        "componentVersions": [
            {
                "componentName": "com.example.HelloWorld",
                "componentVersion": "1.0.1",
                "arn": "arn:aws:greengrass:us-west-2:123456789012:components:com.example.HelloWorld:versions:1.0.1"
            },
            {
                "componentName": "com.example.HelloWorld",
                "componentVersion": "1.0.0",
                "arn": "arn:aws:greengrass:us-west-2:123456789012:components:com.example.HelloWorld:versions:1.0.0"
            }
        ]
    }

For more information, see `Manage components <https://docs.aws.amazon.com/greengrass/v2/developerguide/manage-components.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.