**To delete a version of a managed policy**

This example deletes the version identified as ``v2`` from the policy whose ARN is ``arn:aws:iam::123456789012:policy/MySamplePolicy``. ::

    aws iam delete-policy-version \
        --policy-arn arn:aws:iam::123456789012:policy/MyPolicy \
        --version-id v2

This command produces no output.

For more information, see `Policies and permissions in IAM <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html>`__ in the *AWS IAM User Guide*.