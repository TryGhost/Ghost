**Example 1: To update an endpoint's inference units**

The following ``update-endpoint`` example updates information about an endpoint. In this example, the number of inference units is increased. ::

    aws comprehend update-endpoint \
        --endpoint-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier-endpoint/example-classifier-endpoint
        --desired-inference-units 2

This command produces no output.

For more information, see `Managing Amazon Comprehend endpoints <https://docs.aws.amazon.com/comprehend/latest/dg/manage-endpoints.html>`__ in the *Amazon Comprehend Developer Guide*.

**Example 2: To update an endpoint's actie model**

The following ``update-endpoint`` example updates information about an endpoint. In this example, the active model is changed. ::

    aws comprehend update-endpoint \
        --endpoint-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier-endpoint/example-classifier-endpoint
        --active-model-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-classifier-new

This command produces no output.

For more information, see `Managing Amazon Comprehend endpoints <https://docs.aws.amazon.com/comprehend/latest/dg/manage-endpoints.html>`__ in the *Amazon Comprehend Developer Guide*.