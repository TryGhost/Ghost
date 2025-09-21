**To remove a policy from an IAM user**

The following ``delete-user-policy`` command removes the specified policy from the IAM user named ``Bob``. ::

    aws iam delete-user-policy \
        --user-name Bob \
        --policy-name ExamplePolicy

This command produces no output.

To get a list of policies for an IAM user, use the ``list-user-policies`` command.

For more information, see `Creating an IAM user in your AWS account <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html>`__ in the *AWS IAM User Guide*.