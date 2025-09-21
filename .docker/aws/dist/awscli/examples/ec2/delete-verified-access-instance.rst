**To delete a Verified Access instance**

The following ``delete-verified-access-instance`` example deletes the specified Verified Access instance. ::

    aws ec2 delete-verified-access-instance \
        --verified-access-instance-id vai-0ce000c0b7643abea

Output::

    {
        "VerifiedAccessInstance": {
            "VerifiedAccessInstanceId": "vai-0ce000c0b7643abea",
            "Description": "Testing Verified Access",
            "VerifiedAccessTrustProviders": [],
            "CreationTime": "2023-08-25T18:27:56",
            "LastUpdatedTime": "2023-08-26T01:00:18"
        }
    }

For more information, see `Verified Access instances <https://docs.aws.amazon.com/verified-access/latest/ug/verified-access-instances.html>`__ in the *AWS Verified Access User Guide*.
