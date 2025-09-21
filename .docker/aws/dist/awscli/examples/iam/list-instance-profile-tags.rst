**To list the tags attached to an instance profile**

The following ``list-instance-profile-tags`` command retrieves the list of tags associated with the specified instance profile. ::

    aws iam list-instance-profile-tags \
        --instance-profile-name deployment-role

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