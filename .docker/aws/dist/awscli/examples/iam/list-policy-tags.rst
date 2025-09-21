**To list the tags attached to a managed policy**

The following ``list-policy-tags`` command retrieves the list of tags associated with the specified managed policy. ::

    aws iam list-policy-tags \
        --policy-arn arn:aws:iam::123456789012:policy/billing-access

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