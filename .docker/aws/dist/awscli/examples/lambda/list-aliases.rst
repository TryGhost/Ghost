**To retrieve the list of aliases for a Lambda function**

The following ``list-aliases`` example displays a list of the aliases for the ``my-function`` Lambda function. ::

    aws lambda list-aliases \
        --function-name my-function

Output::

    {
        "Aliases": [
            {
                "AliasArn": "arn:aws:lambda:us-west-2:123456789012:function:my-function:BETA",
                "RevisionId": "a410117f-ab16-494e-8035-7e204bb7933b",
                "FunctionVersion": "2",
                "Name": "BETA",
                "Description": "alias for beta version of function"
            },
            {
                "AliasArn": "arn:aws:lambda:us-west-2:123456789012:function:my-function:LIVE",
                "RevisionId": "21d40116-f8b1-40ba-9360-3ea284da1bb5",
                "FunctionVersion": "1",
                "Name": "LIVE",
                "Description": "alias for live version of function"
            }
        ]
    }

For more information, see `Configuring AWS Lambda Function Aliases <https://docs.aws.amazon.com/lambda/latest/dg/aliases-intro.html>`__ in the *AWS Lambda Developer Guide*.
