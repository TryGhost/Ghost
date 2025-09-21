**To get a CloudFront field-level encryption configuration**

The following example gets the CloudFront field-level encryption configuration
with the ID ``C3KM2WVD605UAY``, including its ``ETag``::

    aws cloudfront get-field-level-encryption --id C3KM2WVD605UAY

Output::

    {
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
