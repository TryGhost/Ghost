**To list Profiles**

The following ``list-profiles`` lists the Profiles in your AWS account and displays additional information about them. ::

    aws route53profiles list-profiles

Output::

   {
        "ProfileSummaries": [
            {
                "Arn": "arn:aws:route53profiles:us-east-1:123456789012:profile/rp-4987774726example",
                "Id": "rp-4987774726example",
                "Name": "test",
                "ShareStatus": "NOT_SHARED"
            }
        ]
    }