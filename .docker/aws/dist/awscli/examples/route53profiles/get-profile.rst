**To get information about a Profile**

The following ``get-profile`` returns information about the specified Profile. ::

    aws route53profiles get-profile \
        --profile-id rp-4987774726example

Output::

    {
        "Profile": {
            "Arn": "arn:aws:route53profiles:us-east-1:123456789012:profile/rp-4987774726example",
            "ClientToken": "0cbc5ae7-4921-4204-bea9-EXAMPLE11111",
            "CreationTime": 1710851044.288,
            "Id": "rp-4987774726example",
            "ModificationTime": 1710851044.288,
            "Name": "test",
            "OwnerId": "123456789012",
            "ShareStatus": "NOT_SHARED",
            "Status": "COMPLETE",
            "StatusMessage": "Created Profile"
        }
    }