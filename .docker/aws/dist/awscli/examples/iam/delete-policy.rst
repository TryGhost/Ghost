**To delete an IAM policy**

This example deletes the policy whose ARN is ``arn:aws:iam::123456789012:policy/MySamplePolicy``. ::

    aws iam delete-policy \
        --policy-arn arn:aws:iam::123456789012:policy/MySamplePolicy

This command produces no output.

For more information, see `Policies and permissions in IAM <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html>`__ in the *AWS IAM User Guide*.