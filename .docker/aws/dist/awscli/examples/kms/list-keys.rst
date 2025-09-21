**To get the KMS keys in an account and Region**

The following ``list-keys`` example gets the KMS keys in an account and Region. This command returns both AWS managed keys and customer managed keys. ::

    aws kms list-keys 

Output::

    {
        "Keys": [
            {
                "KeyArn": "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
                "KeyId": "1234abcd-12ab-34cd-56ef-1234567890ab"
            },
            {
                "KeyArn": "arn:aws:kms:us-west-2:111122223333:key/0987dcba-09fe-87dc-65ba-ab0987654321",
                "KeyId": "0987dcba-09fe-87dc-65ba-ab0987654321"
            },
            {
                "KeyArn": "arn:aws:kms:us-east-2:111122223333:key/1a2b3c4d-5e6f-1a2b-3c4d-5e6f1a2b3c4d",
                "KeyId": "1a2b3c4d-5e6f-1a2b-3c4d-5e6f1a2b3c4d"
            }
        ]    
    }

For more information, see `Viewing Keys <https://docs.aws.amazon.com/kms/latest/developerguide/viewing-keys.html>`__ in the *AWS Key Management Service Developer Guide*.