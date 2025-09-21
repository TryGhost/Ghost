**To describe a specific endpoint**

The following ``describe-endpoint`` example gets the properties of a model-specific endpoint. ::

    aws comprehend describe-endpoint \
        --endpoint-arn arn:aws:comprehend:us-west-2:111122223333:document-classifier-endpoint/example-classifier-endpoint

Output::

    {
        "EndpointProperties": {
            "EndpointArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier-endpoint/example-classifier-endpoint,
            "Status": "IN_SERVICE",
            "ModelArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/exampleclassifier1",
            "DesiredModelArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/exampleclassifier1",
            "DesiredInferenceUnits": 1,
            "CurrentInferenceUnits": 1,
            "CreationTime": "2023-06-13T20:32:54.526000+00:00",
            "LastModifiedTime": "2023-06-13T20:32:54.526000+00:00"
        }
    }

For more information, see `Managing Amazon Comprehend endpoints <https://docs.aws.amazon.com/comprehend/latest/dg/manage-endpoints.html>`__ in the *Amazon Comprehend Developer Guide*.