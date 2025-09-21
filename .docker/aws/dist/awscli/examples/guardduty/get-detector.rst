**To retrieve details of a specific detector**

The following ``get-detector`` example displays the configurations details of the specified detector. ::

    aws guardduty get-detector \
        --detector-id 12abc34d567e8fa901bc2d34eexample

Output::

    {
        "Status": "ENABLED",
        "ServiceRole": "arn:aws:iam::111122223333:role/aws-service-role/guardduty.amazonaws.com/AWSServiceRoleForAmazonGuardDuty",
        "Tags": {},
        "FindingPublishingFrequency": "SIX_HOURS",
        "UpdatedAt": "2018-11-07T03:24:22.938Z",
        "CreatedAt": "2017-12-22T22:51:31.940Z"
    }
    
For more information, see `Concepts and Terminology <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_concepts.html>`__ in the GuardDuty User Guide.