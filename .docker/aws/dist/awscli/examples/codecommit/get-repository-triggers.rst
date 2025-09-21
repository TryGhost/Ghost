**To get information about triggers in a repository**

This example shows details about triggers configured for an AWS CodeCommit repository named ``MyDemoRepo``. ::

    aws codecommit get-repository-triggers \
        --repository-name MyDemoRepo

Output::

    {
        "configurationId": "f7579e13-b83e-4027-aaef-650c0EXAMPLE",
        "triggers": [
            {
                "destinationArn": "arn:aws:sns:us-east-1:111111111111:MyCodeCommitTopic",
                "branches": [
                    "main",
                    "preprod"
                ],
                "name": "MyFirstTrigger",
                "customData": "",
                "events": [
                    "all"
                ]
            },
            {
                "destinationArn": "arn:aws:lambda:us-east-1:111111111111:function:MyCodeCommitPythonFunction",
                "branches": [],
                "name": "MySecondTrigger",
                "customData": "EXAMPLE",
                "events": [
                    "all"
                ]
            }
        ]
    }