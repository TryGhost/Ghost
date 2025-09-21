**To remove tags for an AWS resource (for example: channel, stream key)**

The following ``untag-resource`` example removes the specified tags for a specified resource ARN (Amazon Resource Name). ::

    aws ivs untag-resource \
        --resource-arn arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh \
        --tag-keys "tagkey1, tagkey2"

This command produces no output.

For more information, see `Tagging <https://docs.aws.amazon.com/ivs/latest/APIReference/Welcome.html>`__ in the *Amazon Interactive Video Service API Reference*.