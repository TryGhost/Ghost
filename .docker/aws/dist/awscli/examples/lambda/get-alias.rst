**To retrieve details about a function alias**

The following ``get-alias`` example displays details for the alias named ``LIVE`` on the ``my-function`` Lambda function. ::

    aws lambda get-alias \
        --function-name my-function \
        --name LIVE

Output::

    {
        "FunctionVersion": "3",
        "Name": "LIVE",
        "AliasArn": "arn:aws:lambda:us-west-2:123456789012:function:my-function:LIVE",
        "RevisionId": "594f41fb-b85f-4c20-95c7-6ca5f2a92c93",
        "Description": "alias for live version of function"
    }

For more information, see `Configuring AWS Lambda Function Aliases <https://docs.aws.amazon.com/lambda/latest/dg/aliases-intro.html>`__ in the *AWS Lambda Developer Guide*.
