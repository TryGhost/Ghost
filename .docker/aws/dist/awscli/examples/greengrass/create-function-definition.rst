**To create a Lambda function definition**

The following ``create-function-definition`` example creates a Lambda function definition and an initial version by providing a list of Lambda functions (in this case, a list of just one function named ``TempMonitorFunction``) and their configurations. Before you can create the function definition, you need the Lambda function ARN. To create the function and its alias, use Lambda's ``create-function`` and ``publish-version`` commands. Lambda's ``create-function`` command requires the ARN of the execution role, even though AWS IoT Greengrass doesn't use that role because permissions are specified in the Greengrass group role.  You can use the IAM ``create-role`` command to create an empty role to get an ARN to use with Lambda's ``create-function`` or you can use an existing execution role. ::

    aws greengrass create-function-definition \
        --name MyGreengrassFunctions \
        --initial-version "{\"Functions\": [{\"Id\": \"TempMonitorFunction\", \"FunctionArn\": \"arn:aws:lambda:us-west-2:123456789012:function:TempMonitor:GG_TempMonitor\", \"FunctionConfiguration\": {\"Executable\": \"temp_monitor.function_handler\", \"MemorySize\": 16000,\"Timeout\": 5}}]}"

Output::

    {
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/3b0d0080-87e7-48c6-b182-503ec743a08b",
        "CreationTimestamp": "2019-06-19T22:24:44.585Z",
        "Id": "3b0d0080-87e7-48c6-b182-503ec743a08b",
        "LastUpdatedTimestamp": "2019-06-19T22:24:44.585Z",
        "LatestVersion": "67f918b9-efb4-40b0-b87c-de8c9faf085b",
        "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/3b0d0080-87e7-48c6-b182-503ec743a08b/versions/67f918b9-efb4-40b0-b87c-de8c9faf085b",
        "Name": "MyGreengrassFunctions"
    }

For more information, see `How to Configure Local Resource Access Using the AWS Command Line Interface <https://docs.aws.amazon.com/greengrass/latest/developerguide/lra-cli.html>`__ in the *AWS IoT Greengrass Developer Guide*.
