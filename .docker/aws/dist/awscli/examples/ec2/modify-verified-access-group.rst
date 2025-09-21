**To modify the configuration of a Verified Access group**

The following ``modify-verified-access-group`` example adds the specified description to the specified Verified Access group. ::

    aws ec2 modify-verified-access-group \
        --verified-access-group-id vagr-0dbe967baf14b7235 \
        --description "Testing Verified Access"

Output::

    {
        "VerifiedAccessGroup": {
            "VerifiedAccessGroupId": "vagr-0dbe967baf14b7235",
            "VerifiedAccessInstanceId": "vai-0ce000c0b7643abea",
            "Description": "Testing Verified Access",
            "Owner": "123456789012",
            "VerifiedAccessGroupArn": "arn:aws:ec2:us-east-2:123456789012:verified-access-group/vagr-0dbe967baf14b7235",
            "CreationTime": "2023-08-25T19:55:19",
            "LastUpdatedTime": "2023-08-25T22:17:25"
        }
    }

For more information, see `Verified Access groups <https://docs.aws.amazon.com/verified-access/latest/ug/verified-access-groups.html>`__ in the *AWS Verified Access User Guide*.
