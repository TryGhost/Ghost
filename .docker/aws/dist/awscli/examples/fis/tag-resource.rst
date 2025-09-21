**To tag a resource**

The following ``tag-resource`` example tags the specified resource. ::

    aws fis tag-resource \
        --resource-arn arn:aws:fis:us-west-2:123456789012:experiment/ABC12DeFGhI3jKLMNOP \
        --tags key1=value1,key2=value2

This command produces no output.

For more information, see `Tag your AWS FIS resources <https://docs.aws.amazon.com/fis/latest/userguide/tagging.html>`__ in the *AWS Fault Injection Simulator User Guide*.
