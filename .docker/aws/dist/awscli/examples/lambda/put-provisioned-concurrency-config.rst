**To allocate provisioned concurrency**

The following ``put-provisioned-concurrency-config`` example allocates 100 provisioned concurrency for the ``BLUE`` alias of the specified function. ::

    aws lambda put-provisioned-concurrency-config \
        --function-name my-function \
        --qualifier BLUE \
        --provisioned-concurrent-executions 100

Output::

    {
        "Requested ProvisionedConcurrentExecutions": 100,
        "Allocated ProvisionedConcurrentExecutions": 0,
        "Status": "IN_PROGRESS",
        "LastModified": "2019-11-21T19:32:12+0000"
    }
