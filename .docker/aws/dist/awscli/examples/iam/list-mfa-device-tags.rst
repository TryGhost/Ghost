**To list the tags attached to an MFA device**

The following ``list-mfa-device-tags`` command retrieves the list of tags associated with the specified MFA device. ::

    aws iam list-mfa-device-tags \
        --serial-number arn:aws:iam::123456789012:mfa/alice

Output::

    {
        "Tags": [
            {
                "Key": "DeptID",
                "Value": "123456"
            },
            {
                "Key": "Department",
                "Value": "Accounting"
            }
        ]
    }

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.