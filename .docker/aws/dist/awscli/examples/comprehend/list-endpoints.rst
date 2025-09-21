**To list of all endpoints**

The following ``list-endpoints`` example lists all active model-specific endpoints. ::

    aws comprehend list-endpoints

Output::

    {
        "EndpointPropertiesList": [
            {
                "EndpointArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier-endpoint/ExampleClassifierEndpoint",
                "Status": "IN_SERVICE",
                "ModelArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/exampleclassifier1",
                "DesiredModelArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/exampleclassifier1",
                "DesiredInferenceUnits": 1,
                "CurrentInferenceUnits": 1,
                "CreationTime": "2023-06-13T20:32:54.526000+00:00",
                "LastModifiedTime": "2023-06-13T20:32:54.526000+00:00"
            },
            {
                "EndpointArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier-endpoint/ExampleClassifierEndpoint2",
                "Status": "IN_SERVICE",
                "ModelArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/exampleclassifier2",
                "DesiredModelArn": "arn:aws:comprehend:us-west-2:111122223333:document-classifier/exampleclassifier2",
                "DesiredInferenceUnits": 1,
                "CurrentInferenceUnits": 1,
                "CreationTime": "2023-06-13T20:32:54.526000+00:00",
                "LastModifiedTime": "2023-06-13T20:32:54.526000+00:00"
            }
        ]
    }

For more information, see `Managing Amazon Comprehend endpoints <https://docs.aws.amazon.com/comprehend/latest/dg/manage-endpoints.html>`__ in the *Amazon Comprehend Developer Guide*.