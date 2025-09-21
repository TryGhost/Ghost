**To add a policy to a group**

The following ``put-group-policy`` command adds a policy to the IAM group named ``Admins``. ::

    aws iam put-group-policy \
        --group-name Admins \
        --policy-document file://AdminPolicy.json \
        --policy-name AdminRoot

This command produces no output.

The policy is defined as a JSON document in the *AdminPolicy.json* file. (The file name and extension do not have
significance.)

For more information, see `Managing IAM policies <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html>`__ in the *AWS IAM User Guide*.