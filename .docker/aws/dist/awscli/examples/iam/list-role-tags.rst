**To list the tags attached to a role**

The following ``list-role-tags`` command retrieves the list of tags associated with the specified role. ::

    aws iam list-role-tags \
        --role-name production-role

Output::

    {
        "Tags": [
            {
                "Key": "Department",
                "Value": "Accounting"
            },
            {
                "Key": "DeptID",
                "Value": "12345"
            }
        ],
        "IsTruncated": false
    }

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.