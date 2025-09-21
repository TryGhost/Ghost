**To get a paginated listing of App Runner services**

The following ``list-services`` example lists all App Runner services in the AWS account. Up to two services are listed in each response.
This example shows the first request. The response includes two results and a token that can be used in the next request.
When a subsequent response doesn't include a token, all services have been listed. ::

    aws apprunner list-services \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "MaxResults": 2
    }

Output::

    {
        "NextToken": "eyJDdXN0b21lckFjY291bnRJZCI6IjI3MDIwNTQwMjg0NSIsIlNlcnZpY2VTdGF0dXNDb2RlIjoiUFJPVklTSU9OSU5HIiwiSGFzaEtleSI6IjI3MDIwNTQwMjg0NSNhYjhmOTRjZmUyOWE0NjBmYjg3NjBhZmQyZWU4NzU1NSJ9",
        "ServiceSummaryList": [
            {
                "CreatedAt": "2020-11-20T19:05:25Z",
                "UpdatedAt": "2020-11-23T12:41:37Z",
                "ServiceArn": "arn:aws:apprunner:us-east-1:123456789012:service/python-app/8fe1e10304f84fd2b0df550fe98a71fa",
                "ServiceId": "8fe1e10304f84fd2b0df550fe98a71fa",
                "ServiceName": "python-app",
                "ServiceUrl": "psbqam834h.us-east-1.awsapprunner.com",
                "Status": "RUNNING"
            },
            {
                "CreatedAt": "2020-11-06T23:15:30Z",
                "UpdatedAt": "2020-11-23T13:21:22Z",
                "ServiceArn": "arn:aws:apprunner:us-east-1:123456789012:service/golang-container-app/ab8f94cfe29a460fb8760afd2ee87555",
                "ServiceId": "ab8f94cfe29a460fb8760afd2ee87555",
                "ServiceName": "golang-container-app",
                "ServiceUrl": "e2m8rrrx33.us-east-1.awsapprunner.com",
                "Status": "RUNNING"
            }
        ]
    }
