**To create an IAM group**

The following ``create-group`` command creates an IAM group named ``Admins``. ::

    aws iam create-group \
        --group-name Admins

Output::

    {
        "Group": {
            "Path": "/",
            "CreateDate": "2015-03-09T20:30:24.940Z",
            "GroupId": "AIDGPMS9RO4H3FEXAMPLE",
            "Arn": "arn:aws:iam::123456789012:group/Admins",
            "GroupName": "Admins"
        }
    }

For more information, see `Creating IAM user groups <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups_create.html>`__ in the *AWS IAM User Guide*.