**To list the active resource operation requests**

The following ``list-resource-requests`` example lists the resource requests for CREATE and UPDATE operations that have failed in your AWS account. ::

    aws cloudcontrol list-resource-requests \
        --resource-request-status-filter Operations=CREATE,OperationStatuses=FAILED

Output::

    {
        "ResourceRequestStatusSummaries": [
            {
                "TypeName": "AWS::Kinesis::Stream",
                "Identifier": "Demo",
                "RequestToken": "e1a6b86e-46bd-41ac-bfba-633abcdfdbd7",
                "Operation": "CREATE",
                "OperationStatus": "FAILED",
                "EventTime": 1632950268.481,
                "StatusMessage": "Resource of type 'AWS::Kinesis::Stream' with identifier 'Demo' already exists.",
                "ErrorCode": "AlreadyExists"
            }
        ]
    }

For more information, see `Managing resource operation requests <https://docs.aws.amazon.com/cloudcontrolapi/latest/userguide/resource-operations-manage-requests.html>`__ in the *Cloud Control API User Guide*.