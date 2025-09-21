**To list tags for a resource**

The following ``list-tags-for-resource`` example lists the tags for the specified resource. ::

    aws fis list-tags-for-resource \
        --resource-arn arn:aws:fis:us-west-2:123456789012:experiment/ABC12DeFGhI3jKLMNOP

Output::

    {
        "tags": {
            "key1": "value1",
            "key2": "value2"
        }
    }

For more information, see `Tag your AWS FIS resources <https://docs.aws.amazon.com/fis/latest/userguide/tagging.html>`__ in the *AWS Fault Injection Simulator User Guide*.