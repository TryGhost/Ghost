**To update a CloudFront field-level encryption profile**

The following example updates the field-level encryption profile with the ID
``PPK0UOSIF5WSV``. This example updates the profile's ``Name`` and ``Comment``,
and adds a second ``FieldPatterns`` item, by providing the parameters in a JSON
file.

To update a field-level encryption profile, you must have the profile's ID and ``ETag``. The ID is returned in the output of the
`create-field-level-encryption-profile
<create-field-level-encryption-profile.html>`_ and
`list-field-level-encryption-profiles
<list-field-level-encryption-profiles.html>`_ commands.
To get the ``ETag``, use the
`get-field-level-encryption-profile
<get-field-level-encryption-profile.html>`_ or
`get-field-level-encryption-profile-config
<get-field-level-encryption-profile-config.html>`_ command.
Use the ``--if-match`` option to provide the profile's ``ETag``.

::

    aws cloudfront update-field-level-encryption-profile \
        --id PPK0UOSIF5WSV \
        --if-match E1QQG65FS2L2GC \
        --field-level-encryption-profile-config file://fle-profile-config.json

The file ``fle-profile-config.json`` is a JSON document in the current
directory that contains the following::

    {
        "Name": "ExampleFLEProfileUpdated",
        "CallerReference": "cli-example",
        "Comment": "Updated FLE profile for AWS CLI example",
        "EncryptionEntities": {
            "Quantity": 1,
            "Items": [
                {
                    "PublicKeyId": "K2K8NC4HVFE3M0",
                    "ProviderId": "ExampleFLEProvider",
                    "FieldPatterns": {
                        "Quantity": 2,
                        "Items": [
                            "ExampleSensitiveField",
                            "SecondExampleSensitiveField"
                        ]
                    }
                }
            ]
        }
    }

Output::

    {
        "ETag": "EJETYFJ9CL66D",
        "FieldLevelEncryptionProfile": {
            "Id": "PPK0UOSIF5WSV",
            "LastModifiedTime": "2019-12-10T19:05:58.296Z",
            "FieldLevelEncryptionProfileConfig": {
                "Name": "ExampleFLEProfileUpdated",
                "CallerReference": "cli-example",
                "Comment": "Updated FLE profile for AWS CLI example",
                "EncryptionEntities": {
                    "Quantity": 1,
                    "Items": [
                        {
                            "PublicKeyId": "K2K8NC4HVFE3M0",
                            "ProviderId": "ExampleFLEProvider",
                            "FieldPatterns": {
                                "Quantity": 2,
                                "Items": [
                                    "ExampleSensitiveField",
                                    "SecondExampleSensitiveField"
                                ]
                            }
                        }
                    ]
                }
            }
        }
    }
