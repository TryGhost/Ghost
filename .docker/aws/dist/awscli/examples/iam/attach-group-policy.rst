**To attach a managed policy to an IAM group**

The following ``attach-group-policy`` command attaches the AWS managed policy named ``ReadOnlyAccess`` to the IAM group named ``Finance``. ::

    aws iam attach-group-policy \
        --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess \
        --group-name Finance

This command produces no output.

For more information, see `Managed policies and inline policies <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html>`__ in the *AWS IAM User Guide*.