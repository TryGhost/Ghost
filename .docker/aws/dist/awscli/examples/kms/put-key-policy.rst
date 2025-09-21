**To change the key policy for a KMS key**

The following ``put-key-policy`` example changes the key policy for a customer managed key. 

To begin, create a key policy and save it in a local JSON file. In this example, the file is ``key_policy.json``. You can also specify the key policy as a string value of the ``policy`` parameter. 

The first statement in this key policy gives the AWS account permission to use IAM policies to control access to the KMS key. The second statement gives the ``test-user`` user permission to run the ``describe-key`` and ``list-keys`` commands on the KMS key.

Contents of ``key_policy.json``::

    {
        "Version" : "2012-10-17",
        "Id" : "key-default-1",
        "Statement" : [
            {
                "Sid" : "Enable IAM User Permissions",
                "Effect" : "Allow",
                "Principal" : {
                    "AWS" : "arn:aws:iam::111122223333:root"
                },
                "Action" : "kms:*",
                "Resource" : "*"
            },
            {
                "Sid" : "Allow Use of Key",
                "Effect" : "Allow",
                "Principal" : {
                    "AWS" : "arn:aws:iam::111122223333:user/test-user"
                },
                "Action" : [
                    "kms:DescribeKey",
                    "kms:ListKeys"
                ],
                "Resource" : "*"
            }
        ]
    }

To identify the KMS key, this example uses the key ID, but you can also use a key ARN. To specify the key policy, the command uses the ``policy`` parameter. To indicate that the policy is in a file, it uses the required ``file://`` prefix. This prefix is required to identify files on all supported operating systems. Finally, the command uses the ``policy-name`` parameter with a value of ``default``. If no policy name is specified, the default value is ``default``. The only valid value is ``default``. ::

    aws kms put-key-policy \
        --policy-name default \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --policy file://key_policy.json

This command does not produce any output. To verify that the command was effective, use the ``get-key-policy`` command. The following example command gets the key policy for the same KMS key. The ``output`` parameter with a value of ``text`` returns a text format that is easy to read. ::

    aws kms get-key-policy \
        --policy-name default \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --output text

Output::

    {
        "Version" : "2012-10-17",
        "Id" : "key-default-1",
        "Statement" : [ 
            {
                "Sid" : "Enable IAM User Permissions",
                "Effect" : "Allow",
                "Principal" : {
                    "AWS" : "arn:aws:iam::111122223333:root"
                },
                "Action" : "kms:*",
                "Resource" : "*"
                }, 
                {
                "Sid" : "Allow Use of Key",
                "Effect" : "Allow",
                "Principal" : {
                    "AWS" : "arn:aws:iam::111122223333:user/test-user"
                },
                "Action" : [ "kms:Describe", "kms:List" ],
                "Resource" : "*"
            } 
        ]
    }

For more information, see `Changing a Key Policy <https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying.html>`__ in the *AWS Key Management Service Developer Guide*.