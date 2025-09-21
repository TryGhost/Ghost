**To list policies for an IAM user**

The following ``list-user-policies`` command lists the policies that are attached to the IAM user named ``Bob``. ::

    aws iam list-user-policies \
        --user-name Bob

Output::

    {
        "PolicyNames": [
            "ExamplePolicy",
            "TestPolicy"
        ]
    }

For more information, see `Creating an IAM user in your AWS account <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html>`__ in the *AWS IAM User Guide*.