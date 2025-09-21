**To list Profile associations**

The following ``list-profile-associations`` lists the Profile associations in your AWS account. ::

    aws route53profiles list-profile-associations

Output::

    {
        "ProfileAssociations": [
            {
                "CreationTime": 1709338817.148,
                "Id": "rpassoc-489ce212fexample",
                "ModificationTime": 1709338974.772,
                "Name": "test-association",
                "OwnerId": "123456789012",
                "ProfileId": "rp-4987774726example",
                "ResourceId": "vpc-0af3b96b3example",
                "Status": "COMPLETE",
                "StatusMessage": "Created Profile Association"
            }
        ]
    }