**To create a version of the function definition**

The following ``create-function-definition-version`` example creates a new version of the specified function definition. This version specifies a single function whose ID is ``Hello-World-function``, allows access to the file system, and specifies a maximum memory size and timeout period. ::

    aws greengrass create-function-definition-version \
        --cli-input-json "{\"FunctionDefinitionId\": \"e626e8c9-3b8f-4bf3-9cdc-d26ecdeb9fa3\",\"Functions\": [{\"Id\": \"Hello-World-function\", \"FunctionArn\": \""arn:aws:lambda:us-west-2:123456789012:function:Greengrass_HelloWorld_Counter:gghw-alias"\",\"FunctionConfiguration\": {\"Environment\": {\"AccessSysfs\": true},\"Executable\": \"greengrassHelloWorldCounter.function_handler\",\"MemorySize\": 16000,\"Pinned\": false,\"Timeout\": 25}}]}"

Output::

    {
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/e626e8c9-3b8f-4bf3-9cdc-d26ecdeb9fa3/versions/74abd1cc-637e-4abe-8684-9a67890f4043",
        "CreationTimestamp": "2019-06-25T22:03:43.376Z",
        "Id": "e626e8c9-3b8f-4bf3-9cdc-d26ecdeb9fa3",
        "Version": "74abd1cc-637e-4abe-8684-9a67890f4043"
    }
