**To get metadata about a CloudFront field-level encryption configuration**

The following example gets metadata about the CloudFront field-level encryption
configuration with the ID ``C3KM2WVD605UAY``, including its ``ETag``::

    aws cloudfront get-field-level-encryption-config --id C3KM2WVD605UAY

Output::

    {
        "ETag": "E2P4Z4VU7TY5SG",
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
