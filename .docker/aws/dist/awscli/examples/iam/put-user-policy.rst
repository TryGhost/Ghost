**To attach a policy to an IAM user**

The following ``put-user-policy`` command attaches a policy to the IAM user named ``Bob``. ::

    aws iam put-user-policy \
        --user-name Bob \
        --policy-name ExamplePolicy \
        --policy-document file://AdminPolicy.json

This command produces no output.

The policy is defined as a JSON document in the *AdminPolicy.json* file. (The file name and extension do not have significance.)

For more information, see `Adding and removing IAM identity permissions <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage-attach-detach.html>`__ in the *AWS IAM User Guide*.