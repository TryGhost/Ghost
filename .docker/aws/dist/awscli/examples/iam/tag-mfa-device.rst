**To add a tag to an MFA device**

The following ``tag-mfa-device`` command adds a tag with a Department name to the specified MFA device. ::

    aws iam tag-mfa-device \
        --serial-number arn:aws:iam::123456789012:mfa/alice \
        --tags '[{"Key": "Department", "Value": "Accounting"}]'

This command produces no output.

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.