**To create an endpoint for a custom model**

The following ``create-endpoint`` example creates an endpoint for synchronous inference for a previously trained custom model. ::

    aws comprehend create-endpoint \
        --endpoint-name example-classifier-endpoint-1 \
        --model-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier/example-classifier \
        --desired-inference-units 1

Output::

    {
        "EndpointArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier-endpoint/example-classifier-endpoint-1"
    }

For more information, see `Managing Amazon Comprehend endpoints <https://docs.aws.amazon.com/comprehend/latest/dg/manage-endpoints.html>`__ in the *Amazon Comprehend Developer Guide*.