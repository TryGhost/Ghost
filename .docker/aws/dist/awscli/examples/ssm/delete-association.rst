**Example 1: To delete an association using the association ID**

The following ``delete-association`` example deletes the association for the specified association ID. There is no output if the command succeeds. ::

    aws ssm delete-association \
        --association-id "8dfe3659-4309-493a-8755-0123456789ab"

This command produces no output.

For more information, see `Editing and creating a new version of an association <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-state-assoc-edit.html>`__ in the *AWS Systems Manager User Guide*.

**Example 2: To delete an association**

The following ``delete-association`` example deletes the association between an instance and a document. There is no output if the command succeeds. ::

    aws ssm delete-association \
        --instance-id "i-1234567890abcdef0" \
        --name "AWS-UpdateSSMAgent"

This command produces no output.

For more information, see `Working with associations in Systems Manager <https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-associations.html>`__ in the *AWS Systems Manager User Guide*.