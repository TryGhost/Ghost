**To view the reserved concurrency setting for a function**

The following ``get-function-concurrency`` example retrieves the reserved concurrency setting for the specified function. ::

    aws lambda get-function-concurrency \
        --function-name my-function

Output::

    {
        "ReservedConcurrentExecutions": 250
    }
