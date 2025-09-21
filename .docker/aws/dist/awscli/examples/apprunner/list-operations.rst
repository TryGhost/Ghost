**To list operations that occurred on a servicee**

The following ``list-operations`` example lists all operations that occurred on an App Runner service so far.
In this example, the service is new and only a single operation of type ``CREATE_SERVICE`` has occurred. ::

    aws apprunner list-operations \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "ServiceArn": "arn:aws:apprunner:us-east-1:123456789012:service/python-app/8fe1e10304f84fd2b0df550fe98a71fa"
    }

Output::

    {
        "OperationSummaryList": [
            {
                "EndedAt": 1606156217,
                "Id": "17fe9f55-7e91-4097-b243-fcabbb69a4cf", 
                "StartedAt": 1606156014,
                "Status": "SUCCEEDED", 
                "TargetArn": "arn:aws:apprunner:us-east-1:123456789012:service/python-app/8fe1e10304f84fd2b0df550fe98a71fa", 
                "Type": "CREATE_SERVICE",
                "UpdatedAt": 1606156217
            }
        ]
    }
