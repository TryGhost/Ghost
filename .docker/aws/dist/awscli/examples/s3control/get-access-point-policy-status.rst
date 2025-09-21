**To retrieve the access point policy status**

The following ``get-access-point-policy-status`` example retrieves the access point policy status for the access point named ``finance-ap`` in account 123456789012. The access point policy status indicates whether the access point's policy allows public access. Before running this example, replace the access point name and account number with appropriate values for your use case. ::

    aws s3control get-access-point-policy-status \
        --account-id 123456789012 \
        --name finance-ap

Output::

    {
        "PolicyStatus": {
            "IsPublic": false
        }
    }

For more information about when an access point policy is considered public, see `The Meaning of "Public" <https://docs.aws.amazon.com/AmazonS3/latest/dev/access-control-block-public-access.html#access-control-block-public-access-policy-status>`__ in the *Amazon Simple Storage Service Developer Guide*.
