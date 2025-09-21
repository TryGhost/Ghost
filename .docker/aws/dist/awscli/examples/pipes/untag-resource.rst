**To remove a Tag from an existing pipe**

The following ``untag-resource`` example removes a tag with the key ``stack`` from the Pipe named ``Demo_Pipe``. If the command succeeds, no output is returned. ::

    aws pipes untag-resource \
        --resource-arn arn:aws:pipes:us-east-1:123456789012:pipe/Demo_Pipe \
        --tags stack

For more information, see `Amazon EventBridge Pipes concepts <https://docs.aws.amazon.com/eventbridge/latest/userguide/pipes-concepts.html>`__ in the *Amazon EventBridge User Guide*.