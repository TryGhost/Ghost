**To delete a policy from an IAM group**

The following ``delete-group-policy`` command deletes the policy named ``ExamplePolicy`` from the group named ``Admins``. ::

    aws iam delete-group-policy \
        --group-name Admins \
        --policy-name ExamplePolicy

This command produces no output.

To see the policies attached to a group, use the ``list-group-policies`` command.

For more information, see `Managing IAM policies <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html>`__ in the *AWS IAM User Guide*.