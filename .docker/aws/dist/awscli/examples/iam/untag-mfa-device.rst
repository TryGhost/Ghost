**To remove a tag from an MFA device**

The following ``untag-mfa-device`` command removes any tag with the key name 'Department' from the specified MFA device. ::

    aws iam untag-mfa-device \
        --serial-number arn:aws:iam::123456789012:mfa/alice \
        --tag-keys Department

This command produces no output.

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.