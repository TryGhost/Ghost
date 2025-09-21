**To configure a reserved concurrency limit for a function**

The following ``put-function-concurrency`` example configures 100 reserved concurrent executions for the ``my-function`` function. ::

    aws lambda put-function-concurrency \
        --function-name  my-function  \
        --reserved-concurrent-executions 100

Output::

    {
        "ReservedConcurrentExecutions": 100
    }

For more information, see `Reserving Concurrency for a Lambda Function <https://docs.aws.amazon.com/lambda/latest/dg/per-function-concurrency.html>`__ in the *AWS Lambda Developer Guide*.
