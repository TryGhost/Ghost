**To delete stack instances**

The following ``delete-stack-instances`` example deletes instances of a stack set in two accounts in two regions and terminates the stacks. ::

    aws cloudformation delete-stack-instances \
        --stack-set-name my-stack-set \
        --accounts 123456789012 567890123456 \
        --regions us-east-1 us-west-1 \
        --no-retain-stacks

Output::

    {
        "OperationId": "ad49f10c-fd1d-413f-a20a-8de6e2fa8f27"
    }

To delete an empty stack set, use the ``delete-stack-set`` command.
