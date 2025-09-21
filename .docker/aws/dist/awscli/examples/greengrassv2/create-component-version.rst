**Example 1: To create a component version from a recipe**

The following ``create-component-version`` example creates a version of a Hello World component from a recipe file. ::

    aws greengrassv2 create-component-version \
        --inline-recipe fileb://com.example.HelloWorld-1.0.0.json

Contents of ``com.example.HelloWorld-1.0.0.json``::

    {
        "RecipeFormatVersion": "2020-01-25",
        "ComponentName": "com.example.HelloWorld",
        "ComponentVersion": "1.0.0",
        "ComponentDescription": "My first AWS IoT Greengrass component.",
        "ComponentPublisher": "Amazon",
        "ComponentConfiguration": {
            "DefaultConfiguration": {
                "Message": "world"
            }
        },
        "Manifests": [
            {
                "Platform": {
                    "os": "linux"
                },
                "Lifecycle": {
                    "Run": "echo 'Hello {configuration:/Message}'"
                }
            }
        ]
    }

Output::

    {
        "arn": "arn:aws:greengrass:us-west-2:123456789012:components:com.example.HelloWorld:versions:1.0.0",
        "componentName": "com.example.HelloWorld",
        "componentVersion": "1.0.0",
        "creationTimestamp": "2021-01-07T16:24:33.650000-08:00",
        "status": {
            "componentState": "REQUESTED",
            "message": "NONE",
            "errors": {}
        }
    }

For more information, see `Create custom components <https://docs.aws.amazon.com/greengrass/v2/developerguide/create-components.html>`__ and `Upload components to deploy <https://docs.aws.amazon.com/greengrass/v2/developerguide/upload-components.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.

**Example 2: To create a component version from an AWS Lambda function**

The following ``create-component-version`` example creates a version of a Hello World component from an AWS Lambda function. ::

    aws greengrassv2 create-component-version \
        --cli-input-json file://lambda-function-component.json

Contents of ``lambda-function-component.json``::

    {
        "lambdaFunction": {
            "lambdaArn": "arn:aws:lambda:us-west-2:123456789012:function:HelloWorldPythonLambda:1",
            "componentName": "com.example.HelloWorld",
            "componentVersion": "1.0.0",
            "componentLambdaParameters": {
                "eventSources": [
                    {
                        "topic": "hello/world/+",
                        "type": "IOT_CORE"
                    }
                ]
            }
        }
    }

Output::

    {
        "arn": "arn:aws:greengrass:us-west-2:123456789012:components:com.example.HelloWorld:versions:1.0.0",
        "componentName": "com.example.HelloWorld",
        "componentVersion": "1.0.0",
        "creationTimestamp": "2021-01-07T17:05:27.347000-08:00",
        "status": {
            "componentState": "REQUESTED",
            "message": "NONE",
            "errors": {}
        }
    }

For more information, see `Run AWS Lambda functions <https://docs.aws.amazon.com/greengrass/v2/developerguide/run-lambda-functions.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.