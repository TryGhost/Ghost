**To delete a change set**

The following ``delete-change-set`` example deletes a change set by specifying the change set name and stack name. ::

    aws cloudformation delete-change-set \
        --stack-name my-stack \
        --change-set-name my-change-set

This command produces no output.

The following ``delete-change-set`` example deletes a change set by specifying the full ARN of the change set. ::

    aws cloudformation delete-change-set \
        --change-set-name arn:aws:cloudformation:us-east-2:123456789012:changeSet/my-change-set/4eca1a01-e285-xmpl-8026-9a1967bfb4b0

This command produces no output.
