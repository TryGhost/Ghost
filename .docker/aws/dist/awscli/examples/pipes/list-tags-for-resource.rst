**To list the tags associated with an existing pipe**

The following ``list-tags-for-resource`` example lists all the tags associated with a pipe named ``Demo_Pipe`` in the specified account. ::

    aws pipes list-tags-for-resource \
        --resource-arn arn:aws:pipes:us-east-1:123456789012:pipe/Demo_Pipe 

Output::

    {
        "tags": {
            "stack": "Production",
            "team": "DevOps"
        }
    }

For more information, see `Amazon EventBridge Pipes concepts <https://docs.aws.amazon.com/eventbridge/latest/userguide/pipes-concepts.html>`__ in the *Amazon EventBridge User Guide*.