**To get an IAM group**

This example returns details about the IAM group ``Admins``. ::

    aws iam get-group \
        --group-name Admins

Output::

    {
        "Group": {
            "Path": "/",
            "CreateDate": "2015-06-16T19:41:48Z",
            "GroupId": "AIDGPMS9RO4H3FEXAMPLE",
            "Arn": "arn:aws:iam::123456789012:group/Admins",
            "GroupName": "Admins"
        },
        "Users": []
    }

For more information, see `IAM Identities (users, user groups, and roles) <https://docs.aws.amazon.com/IAM/latest/UserGuide/id.html>`__ in the *AWS IAM User Guide*.