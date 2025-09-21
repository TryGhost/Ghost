**To list components**

The following ``list-components`` example lists each component and its latest version defined in your AWS account in the current Region. ::

    aws greengrassv2 list-components

Output::

    {
        "components": [
            {
                "arn": "arn:aws:greengrass:us-west-2:123456789012:components:com.example.HelloWorld",
                "componentName": "com.example.HelloWorld",
                "latestVersion": {
                    "arn": "arn:aws:greengrass:us-west-2:123456789012:components:com.example.HelloWorld:versions:1.0.1",
                    "componentVersion": "1.0.1",
                    "creationTimestamp": "2021-01-08T16:51:07.352000-08:00",
                    "description": "My first AWS IoT Greengrass component.",
                    "publisher": "Amazon",
                    "platforms": [
                        {
                            "attributes": {
                                "os": "linux"
                            }
                        }
                    ]
                }
            }
        ]
    }

For more information, see `Manage components <https://docs.aws.amazon.com/greengrass/v2/developerguide/manage-components.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.