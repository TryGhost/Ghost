**Example 1: To invoke a Lambda function synchronously**

The following ``invoke`` example invokes the ``my-function`` function synchronously. The ``cli-binary-format`` option is required if you're using AWS CLI version 2. For more information, see `AWS CLI supported global command line options <https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-options.html#cli-configure-options-list>`__ in the *AWS Command Line Interface User Guide*. ::

    aws lambda invoke \
        --function-name my-function \
        --cli-binary-format raw-in-base64-out \
        --payload '{ "name": "Bob" }' \
        response.json

Output::

    {
        "ExecutedVersion": "$LATEST",
        "StatusCode": 200
    }

For more information, see `Invoke a Lambda function synchronously <https://docs.aws.amazon.com/lambda/latest/dg/invocation-sync.html>`__ in the *AWS Lambda Developer Guide*.

**Example 2: To invoke a Lambda function asynchronously**

The following ``invoke`` example invokes the ``my-function`` function asynchronously. The ``cli-binary-format`` option is required if you're using AWS CLI version 2. For more information, see `AWS CLI supported global command line options <https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-options.html#cli-configure-options-list>`__ in the *AWS Command Line Interface User Guide*. ::

    aws lambda invoke \
        --function-name my-function \
        --invocation-type Event \
        --cli-binary-format raw-in-base64-out \
        --payload '{ "name": "Bob" }' \
        response.json

Output::

    {
        "StatusCode": 202
    }

For more information, see `Invoking a Lambda function asynchronously <https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html>`__ in the *AWS Lambda Developer Guide*.
