**To update a CloudFront field-level encryption configuration**

The following example updates the ``Comment`` field of the field-level
encryption configuration with the ID ``C3KM2WVD605UAY`` by providing the
parameters in a JSON file.

To update a field-level encryption configuration, you must have the
configuration's ID and ``ETag``. The ID is returned in the output of the
`create-field-level-encryption-config
<create-field-level-encryption-config.html>`_ and
`list-field-level-encryption-configs
<list-field-level-encryption-configs.html>`_ commands.
To get the ``ETag``, use the
`get-field-level-encryption
<get-field-level-encryption.html>`_ or
`get-field-level-encryption-config
<get-field-level-encryption-config.html>`_ command.
Use the ``--if-match`` option to provide the configuration's ``ETag``.

::

    aws cloudfront update-field-level-encryption-config \
        --id C3KM2WVD605UAY \
        --if-match E2P4Z4VU7TY5SG \
        --field-level-encryption-config file://fle-config.json

The file ``fle-config.json`` is a JSON document in the current directory that
contains the following::

    {
        "CallerReference": "cli-example",
        "Comment": "Updated example FLE configuration",
        "QueryArgProfileConfig": {
            "ForwardWhenQueryArgProfileIsUnknown": true,
            "QueryArgProfiles": {
                "Quantity": 0
            }
        },
        "ContentTypeProfileConfig": {
            "ForwardWhenContentTypeIsUnknown": true,
            "ContentTypeProfiles": {
                "Quantity": 1,
                "Items": [
                    {
                        "Format": "URLEncoded",
                        "ProfileId": "P280MFCLSYOCVU",
                        "ContentType": "application/x-www-form-urlencoded"
                    }
                ]
            }
        }
    }

Output::

    {
        "ETag": "E26M4BIAV81ZF6",
        "FieldLevelEncryption": {
            "Id": "C3KM2WVD605UAY",
            "LastModifiedTime": "2019-12-10T22:26:26.170Z",
            "FieldLevelEncryptionConfig": {
                "CallerReference": "cli-example",
                "Comment": "Updated example FLE configuration",
                "QueryArgProfileConfig": {
                    "ForwardWhenQueryArgProfileIsUnknown": true,
                    "QueryArgProfiles": {
                        "Quantity": 0,
                        "Items": []
                    }
                },
                "ContentTypeProfileConfig": {
                    "ForwardWhenContentTypeIsUnknown": true,
                    "ContentTypeProfiles": {
                        "Quantity": 1,
                        "Items": [
                            {
                                "Format": "URLEncoded",
                                "ProfileId": "P280MFCLSYOCVU",
                                "ContentType": "application/x-www-form-urlencoded"
                            }
                        ]
                    }
                }
            }
        }
    }
