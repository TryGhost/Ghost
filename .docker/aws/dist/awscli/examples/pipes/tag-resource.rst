**To Tag an existing pipe**

The following ``tag-resource`` example tags a Pipe named ``Demo_Pipe``. If the command succeeds, no output is returned. ::

    aws pipes tag-resource \
        --resource-arn arn:aws:pipes:us-east-1:123456789012:pipe/Demo_Pipe \
        --tags stack=Production

For more information, see `Amazon EventBridge Pipes concepts <https://docs.aws.amazon.com/eventbridge/latest/userguide/pipes-concepts.html>`__ in the *Amazon EventBridge User Guide*.