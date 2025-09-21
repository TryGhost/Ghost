**To set the specified version of the specified policy as the policy's default version.**

This example sets the ``v2`` version of the policy whose ARN is ``arn:aws:iam::123456789012:policy/MyPolicy`` as the default active version. ::

    aws iam set-default-policy-version \
        --policy-arn arn:aws:iam::123456789012:policy/MyPolicy \
        --version-id v2

For more information, see `Policies and permissions in IAM <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html>`__ in the *AWS IAM User Guide*.