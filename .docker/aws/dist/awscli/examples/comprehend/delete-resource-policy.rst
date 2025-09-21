**To delete a resource-based policy**

The following ``delete-resource-policy`` example deletes a resource-based policy from an Amazon Comprehend resource. ::

    aws comprehend delete-resource-policy \
        --resource-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-classifier-1/version/1

This command produces no output.

For more information, see `Copying custom models between AWS accounts <https://docs.aws.amazon.com/comprehend/latest/dg/custom-copy.html>`__ in the *Amazon Comprehend Developer Guide*.