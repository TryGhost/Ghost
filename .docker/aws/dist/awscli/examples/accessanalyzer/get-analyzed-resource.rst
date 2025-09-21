**To retrieve information about a resource that was analyzed**

The following ``get-analyzed-resource`` example retrieves information about a resource that was analyzed in your AWS account. ::

    aws accessanalyzer get-analyzed-resource \
        --analyzer-arn arn:aws:access-analyzer:us-west-2:111122223333:analyzer/ConsoleAnalyzer-account \
        --resource-arn arn:aws:s3:::amzn-s3-demo-bucket

Output::

    {
        "resource": {
            "analyzedAt": "2024-02-15T18:01:53.002000+00:00",
            "isPublic": false,
            "resourceArn": "arn:aws:s3:::amzn-s3-demo-bucket",
            "resourceOwnerAccount": "111122223333",
            "resourceType": "AWS::S3::Bucket"
        }
    }

For more information, see `Using AWS Identity and Access Management Access Analyzer <https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html>`__ in the *AWS IAM User Guide*.