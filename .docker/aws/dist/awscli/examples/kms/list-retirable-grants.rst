**To view the grants that a principal can retire**

The following ``list-retirable-grants`` example displays all of the grants that the ``ExampleAdmin`` user can retire on the KMS keys in an AWS account and Region. You can use a command like this one to view the grants that any account principal can retire on KMS keys in the AWS account and Region.

The value of the required ``retiring-principal`` parameter must be the Amazon Resource Name (ARN) of an account, user, or role. 

You cannot specify a service for the value of ``retiring-principal`` in this command, even though a service can be the retiring principal. To find the grants in which a particular service is the retiring principal, use the ``list-grants`` command. 

The output shows that ``ExampleAdmin`` user has permission to retire grants on two different KMS keys in the account and region. In addition to the retiring principal, the account has permission to retire any grant in the account. ::

    aws kms list-retirable-grants \
        --retiring-principal arn:aws:iam::111122223333:user/ExampleAdmin

Output::

    {
        "Grants": [
            {
                "KeyId": "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
                "GrantId": "156b69c63cb154aa21f59929ff19760717be8d9d82b99df53e18b94a15a5e88e",
                "Name": "",
                "CreationDate": 2021-01-14T20:17:36.419000+00:00,
                "GranteePrincipal": "arn:aws:iam::111122223333:user/ExampleUser",
                "RetiringPrincipal": "arn:aws:iam::111122223333:user/ExampleAdmin",
                "IssuingAccount": "arn:aws:iam::111122223333:root",
                "Operations": [
                    "Encrypt"
                ],
                "Constraints": {
                    "EncryptionContextSubset": {
                        "Department": "IT"
                    }
                }
            },
            {
                "KeyId": "arn:aws:kms:us-west-2:111122223333:key/0987dcba-09fe-87dc-65ba-ab0987654321",
                "GrantId": "8c94d1f12f5e69f440bae30eaec9570bb1fb7358824f9ddfa1aa5a0dab1a59b2",
                "Name": "",
                "CreationDate": "2021-02-02T19:49:49.638000+00:00",
                "GranteePrincipal": "arn:aws:iam::111122223333:role/ExampleRole",
                "RetiringPrincipal": "arn:aws:iam::111122223333:user/ExampleAdmin",
                "IssuingAccount": "arn:aws:iam::111122223333:root",
                "Operations": [
                    "Decrypt"
                ],
                "Constraints": {
                    "EncryptionContextSubset": {
                        "Department": "IT"
                    }
                }
            }
        ],
        "Truncated": false
    }

For more information, see `Grants in AWS KMS <https://docs.aws.amazon.com/kms/latest/developerguide/grants.html>`__ in the *AWS Key Management Service Developer Guide*.