**To retrieve details about your account in an AWS Region**

The following ``get-account-settings`` example displays the Lambda limits and usage information for your account. ::

    aws lambda get-account-settings

Output::

    {
        "AccountLimit": {
           "CodeSizeUnzipped": 262144000,
           "UnreservedConcurrentExecutions": 1000,
           "ConcurrentExecutions": 1000,
           "CodeSizeZipped": 52428800,
           "TotalCodeSize": 80530636800
        },
        "AccountUsage": {
           "FunctionCount": 4,
           "TotalCodeSize": 9426
        }
    }

For more information, see `AWS Lambda Limits <https://docs.aws.amazon.com/lambda/latest/dg/limits.html>`__ in the *AWS Lambda Developer Guide*.
