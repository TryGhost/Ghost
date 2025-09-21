**To delete an endpoint for a custom model**

The following ``delete-endpoint`` example deletes a model-specific endpoint. All endpoints must be deleted in order for the model to be deleted. ::

    aws comprehend delete-endpoint \
        --endpoint-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier-endpoint/example-classifier-endpoint-1

This command produces no output.

For more information, see `Managing Amazon Comprehend endpoints <https://docs.aws.amazon.com/comprehend/latest/dg/manage-endpoints.html>`__ in the *Amazon Comprehend Developer Guide*.