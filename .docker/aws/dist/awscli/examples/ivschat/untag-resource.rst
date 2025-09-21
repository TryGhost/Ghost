**To remove tags for an AWS resource (for example: Room)**

The following ``untag-resource`` example removes the specified tags for a specified resource ARN (Amazon Resource Name). On success it returns HTTP 200 with an empty response body. ::

    aws ivschat untag-resource \
        --resource-arn arn:aws:ivschat:us-west-2:12345689012:room/g1H2I3j4k5L6 \
        --tag-keys "tagkey1, tagkey2"

This command produces no output.

For more information, see `Tagging <https://docs.aws.amazon.com/ivs/latest/APIReference/Welcome.html>`__ in the *Amazon Interactive Video Service API Reference*.