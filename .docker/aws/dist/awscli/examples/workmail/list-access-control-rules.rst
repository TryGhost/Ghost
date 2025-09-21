**To list access control rules**

The following ``list-access-control-rules`` example lists the access control rules for the specified Amazon WorkMail organization. ::

    aws workmail list-access-control-rules \
        --organization-id m-n1pq2345678r901st2u3vx45x6789yza

Output::

    {
        "Rules": [
            {
                "Name": "default",
                "Effect": "ALLOW",
                "Description": "Default WorkMail Rule",
                "DateCreated": 0.0,
                "DateModified": 0.0
            },
            {
                "Name": "myRule",
                "Effect": "DENY",
                "Description": "my rule",
                "UserIds": [
                "S-1-1-11-1111111111-2222222222-3333333333-3333"
                ],
                "DateCreated": 1581635628.0,
                "DateModified": 1581635628.0
            }
        ]
    }

For more information, see `Working with Access Control Rules <https://docs.aws.amazon.com/workmail/latest/adminguide/access-rules.html>`__ in the *Amazon WorkMail Administrator Guide*.
