**To list the available widgets**

The following ``list-analyzed-resources`` example lists the available widgets in your AWS account. ::

    aws accessanalyzer list-analyzed-resources \
        --analyzer-arn arn:aws:access-analyzer:us-west-2:111122223333:analyzer/ConsoleAnalyzer-account \
        --resource-type AWS::IAM::Role

Output::

    {
        "analyzedResources": [
            {
                "resourceArn": "arn:aws:sns:us-west-2:111122223333:Validation-Email",
                "resourceOwnerAccount": "111122223333",
                "resourceType": "AWS::SNS::Topic"
            },
            {
                "resourceArn": "arn:aws:sns:us-west-2:111122223333:admin-alerts",
                "resourceOwnerAccount": "111122223333",
                "resourceType": "AWS::SNS::Topic"
            },
            {
                "resourceArn": "arn:aws:sns:us-west-2:111122223333:config-topic",
                "resourceOwnerAccount": "111122223333",
                "resourceType": "AWS::SNS::Topic"
            },
            {
                "resourceArn": "arn:aws:sns:us-west-2:111122223333:inspector-topic",
                "resourceOwnerAccount": "111122223333",
                "resourceType": "AWS::SNS::Topic"
            }
        ]
    }

For more information, see `Using AWS Identity and Access Management Access Analyzer <https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html>`__ in the *AWS IAM User Guide*.