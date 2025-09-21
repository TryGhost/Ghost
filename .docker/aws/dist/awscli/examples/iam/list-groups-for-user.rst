**To list the groups that an IAM user belongs to**

The following ``list-groups-for-user`` command displays the groups that the IAM user named ``Bob`` belongs to. ::

    aws iam list-groups-for-user \
        --user-name Bob

Output::

    {
        "Groups": [
            {
                "Path": "/",
                "CreateDate": "2013-05-06T01:18:08Z",
                "GroupId": "AKIAIOSFODNN7EXAMPLE",
                "Arn": "arn:aws:iam::123456789012:group/Admin",
                "GroupName": "Admin"
            },
            {
                "Path": "/",
                "CreateDate": "2013-05-06T01:37:28Z",
                "GroupId": "AKIAI44QH8DHBEXAMPLE",
                "Arn": "arn:aws:iam::123456789012:group/s3-Users",
                "GroupName": "s3-Users"
            }
        ]
    }

For more information, see `Managing IAM user groups <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups_manage.html>`__ in the *AWS IAM User Guide*.