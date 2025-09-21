**To list IAM users**

The following ``list-users`` command lists the IAM users in the current account. ::

    aws iam list-users

Output::

    {
        "Users": [
            {
                "UserName": "Adele",
                "Path": "/",
                "CreateDate": "2013-03-07T05:14:48Z",
                "UserId": "AKIAI44QH8DHBEXAMPLE",
                "Arn": "arn:aws:iam::123456789012:user/Adele"
            },
            {
                "UserName": "Bob",
                "Path": "/",
                "CreateDate": "2012-09-21T23:03:13Z",
                "UserId": "AKIAIOSFODNN7EXAMPLE",
                "Arn": "arn:aws:iam::123456789012:user/Bob"
            }
        ]
    }

For more information, see `Listing IAM users <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_manage.html#id_users_manage_list>`__ in the *AWS IAM User Guide*.