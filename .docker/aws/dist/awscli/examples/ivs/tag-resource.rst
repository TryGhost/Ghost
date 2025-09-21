**To add or update tags for an AWS resource (for example: channel, stream key)**

The following ``tag-resource`` example adds or updates tags for a specified resource ARN (Amazon Resource Name). ::

    aws ivs tag-resource \
        --resource-arn arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh \
        --tags "tagkey1=tagvalue1, tagkey2=tagvalue2"

This command produces no output.

For more information, see `Tagging <https://docs.aws.amazon.com/ivs/latest/APIReference/Welcome.html>`__ in the *Amazon Interactive Video Service API Reference*.