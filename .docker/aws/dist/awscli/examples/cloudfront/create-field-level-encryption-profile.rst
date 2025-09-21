**To create a CloudFront field-level encryption profile**

The following example creates a field-level encryption profile by providing the
parameters in a JSON file named ``fle-profile-config.json``. Before you can
create a field-level encryption profile, you must have a CloudFront public key.
To create a CloudFront public key, see the `create-public-key
<create-public-key.html>`_ command.

For more information about CloudFront field-level encryption, see
`Using Field-Level Encryption to Help Protect Sensitive Data <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/field-level-encryption.html>`_
in the *Amazon CloudFront Developer Guide*.

::

    aws cloudfront create-field-level-encryption-profile \
        --field-level-encryption-profile-config file://fle-profile-config.json

The file ``fle-profile-config.json`` is a JSON document in the current folder
that contains the following::

    {
        "Name": "ExampleFLEProfile",
        "CallerReference": "cli-example",
        "Comment": "FLE profile for AWS CLI example",
        "EncryptionEntities": {
            "Quantity": 1,
            "Items": [
                {
                    "PublicKeyId": "K2K8NC4HVFE3M0",
                    "ProviderId": "ExampleFLEProvider",
                    "FieldPatterns": {
                        "Quantity": 1,
                        "Items": [
                            "ExampleSensitiveField"
                        ]
                    }
                }
            ]
        }
    }

Output::

    {
        "Location": "https://cloudfront.amazonaws.com/2019-03-26/field-level-encryption-profile/PPK0UOSIF5WSV",
        "ETag": "E2QWRUHEXAMPLE",
        "FieldLevelEncryptionProfile": {
            "Id": "PPK0UOSIF5WSV",
            "LastModifiedTime": "2019-12-10T01:03:16.537Z",
            "FieldLevelEncryptionProfileConfig": {
                "Name": "ExampleFLEProfile",
                "CallerReference": "cli-example",
                "Comment": "FLE profile for AWS CLI example",
                "EncryptionEntities": {
                    "Quantity": 1,
                    "Items": [
                        {
                            "PublicKeyId": "K2K8NC4HVFE3M0",
                            "ProviderId": "ExampleFLEProvider",
                            "FieldPatterns": {
                                "Quantity": 1,
                                "Items": [
                                    "ExampleSensitiveField"
                                ]
                            }
                        }
                    ]
                }
            }
        }
    }
