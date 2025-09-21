**To remove the reserved concurrent execution limit from a function**

The following ``delete-function-concurrency`` example deletes the reserved concurrent execution limit from the ``my-function`` function. ::

    aws lambda delete-function-concurrency \
        --function-name  my-function

This command produces no output.

For more information, see `Reserving Concurrency for a Lambda Function <https://docs.aws.amazon.com/lambda/latest/dg/per-function-concurrency.html>`__ in the *AWS Lambda Developer Guide*.
