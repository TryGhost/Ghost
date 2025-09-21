**To create stack instances**

The following ``create-stack-instances`` example creates instances of a stack set in two accounts and in four regions. The fault tolerance setting ensures that the update is attempted in all accounts and regions, even if some stacks cannot be created. ::

    aws cloudformation create-stack-instances \
        --stack-set-name my-stack-set \
        --accounts 123456789012 223456789012 \
        --regions us-east-1 us-east-2 us-west-1 us-west-2 \
        --operation-preferences FailureToleranceCount=7

Output::

    {
        "OperationId": "d7995c31-83c2-xmpl-a3d4-e9ca2811563f"
    }

To create a stack set, use the ``create-stack-set`` command.