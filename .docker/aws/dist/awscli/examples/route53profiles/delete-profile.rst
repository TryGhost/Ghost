**To delete a Profile**

The following ``delete-profile`` example deletes a Profile. ::

    aws route53profiles delete-profile \
        --profile-id rp-6ffe47d5example

Output::

    {
        "Profile": {
            "Arn": "arn:aws:route53profiles:us-east-1:123456789012:profile/rp-6ffe47d5example",
            "ClientToken": "0a15fec0-05d9-4f78-bec0-EXAMPLE11111",
            "CreationTime": 1710850903.578,
            "Id": "rp-6ffe47d5example",
            "ModificationTime": 1710850903.578,
            "Name": "test",
            "OwnerId": "123456789012",
            "ShareStatus": "NOT_SHARED",
            "Status": "DELETED",
            "StatusMessage": "Deleted Profile"
        }
    }