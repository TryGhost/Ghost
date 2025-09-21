**To create a CloudFront field-level encryption configuration**

The following example creates a field-level encryption configuration by
providing the configuration parameters in a JSON file named
``fle-config.json``. Before you can create a field-level encryption
configuration, you must have a field-level encryption profile. To create a
profile, see the `create-field-level-encryption-profile
<create-field-level-encryption-profile.html>`_ command.

For more information about CloudFront field-level
encryption, see
`Using Field-Level Encryption to Help Protect Sensitive Data <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/field-level-encryption.html>`_
in the *Amazon CloudFront Developer Guide*.

::

    aws cloudfront create-field-level-encryption-config \
        --field-level-encryption-config file://fle-config.json

The file ``fle-config.json`` is a JSON document in the current
folder that contains the following::

    {
        "CallerReference": "cli-example",
        "Comment": "Example FLE configuration",
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
        "Location": "https://cloudfront.amazonaws.com/2019-03-26/field-level-encryption/C3KM2WVD605UAY",
        "ETag": "E2P4Z4VU7TY5SG",
        "FieldLevelEncryption": {
            "Id": "C3KM2WVD605UAY",
            "LastModifiedTime": "2019-12-10T21:30:18.974Z",
            "FieldLevelEncryptionConfig": {
                "CallerReference": "cli-example",
                "Comment": "Example FLE configuration",
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
