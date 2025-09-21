**To attach a managed policy to an IAM user**

The following ``attach-user-policy`` command attaches the AWS managed policy named ``AdministratorAccess`` to the IAM user named ``Alice``. ::

    aws iam attach-user-policy \
        --policy-arn arn:aws:iam::aws:policy/AdministratorAccess \
        --user-name Alice

This command produces no output.

For more information, see `Managed policies and inline policies <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html>`__ in the *AWS IAM User Guide*.
