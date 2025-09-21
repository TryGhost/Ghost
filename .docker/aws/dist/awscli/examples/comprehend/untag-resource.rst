**Example 1: To remove a single tag from a resource**

The following ``untag-resource`` example removes a single tag from an Amazon Comprehend resource. ::

    aws comprehend untag-resource \
        --resource-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-classifier/version/1
        --tag-keys Location 

This command produces no output.

For more information, see `Tagging your resources <https://docs.aws.amazon.com/comprehend/latest/dg/tagging.html>`__ in the *Amazon Comprehend Developer Guide*.

**Example 2: To remove multiple tags from a resource**

The following ``untag-resource`` example removes multiple tags from an Amazon Comprehend resource. ::

    aws comprehend untag-resource \
        --resource-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-classifier/version/1
        --tag-keys Location Department

This command produces no output.

For more information, see `Tagging your resources <https://docs.aws.amazon.com/comprehend/latest/dg/tagging.html>`__ in the *Amazon Comprehend Developer Guide*.