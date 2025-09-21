**To create a Profile**

The following ``create-profile`` example creates a Profile. ::

    aws route53profiles create-profile \
        --name test

Output::

    {
        "Profile": {
            "Arn": "arn:aws:route53profiles:us-east-1:123456789012:profile/rp-6ffe47d5example",
            "ClientToken": "2ca1a304-32b3-4f5f-bc4c-EXAMPLE11111",
            "CreationTime": 1710850903.578,
            "Id": "rp-6ffe47d5example",
            "ModificationTime": 1710850903.578,
            "Name": "test",
            "OwnerId": "123456789012",
            "ShareStatus": "NOT_SHARED",
            "Status": "COMPLETE",
            "StatusMessage": "Created Profile"
        }
    }
