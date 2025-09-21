**To list all tags for an AWS resource (for example: Room)**

The following ``list-tags-for-resource`` example lists all tags for a specified resource ARN (Amazon Resource Name). ::

    aws ivschat list-tags-for-resource \
        --resource-arn arn:aws:ivschat:us-west-2:12345689012:room/g1H2I3j4k5L6

Output::

    {
        "tags":
        {
            "key1": "value1",
            "key2": "value2"
        }
    }

For more information, see `Tagging <https://docs.aws.amazon.com/ivs/latest/APIReference/Welcome.html>`__ in the *Amazon Interactive Video Service API Reference*.