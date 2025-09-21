**To list CloudFront field-level encryption configurations**

The following example gets a list of the CloudFront field-level encryption
configurations in your AWS account::

    aws cloudfront list-field-level-encryption-configs

Output::

    {
        "FieldLevelEncryptionList": {
            "MaxItems": 100,
            "Quantity": 1,
            "Items": [
                {
                    "Id": "C3KM2WVD605UAY",
                    "LastModifiedTime": "2019-12-10T21:30:18.974Z",
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
            ]
        }
    }
