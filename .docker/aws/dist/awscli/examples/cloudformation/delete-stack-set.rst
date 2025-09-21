**To delete a stack set**

The following command deletes the specified empty stack set. The stack set must be empty. ::

    aws cloudformation delete-stack-set \
        --stack-set-name my-stack-set

This command produces no output.

To delete instances from the stack set, use the ``delete-stack-instances`` command.