**To update stack instances**

The following ``update-stack-instances`` example retries an update on stack instances in two accounts in two regions with the most recent settings. The specified fault tolerance setting ensures that the update is attempted in all accounts and regions, even if some stacks cannot be updated. ::

    aws cloudformation update-stack-instances \
        --stack-set-name my-stack-set \
        --accounts 123456789012 567890123456 \
        --regions us-east-1 us-west-2 \
        --operation-preferences FailureToleranceCount=3

Output::

    {
        "OperationId": "103ebdf2-21ea-xmpl-8892-de5e30733132"
    }
