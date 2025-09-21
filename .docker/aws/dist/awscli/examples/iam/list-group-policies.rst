**To list all inline policies that are attached to the specified group**

The following ``list-group-policies`` command lists the names of inline policies that are attached to the IAM group named
``Admins`` in the current account. ::

    aws iam list-group-policies \
        --group-name Admins

Output::

    {
        "PolicyNames": [
            "AdminRoot",
            "ExamplePolicy"
        ]
    }

For more information, see `Managing IAM policies <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html>`__ in the *AWS IAM User Guide*.