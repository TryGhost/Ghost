**To list the available policy stores**

The following ``list-policy-stores`` example lists all policy stores in the AWS Region. All commands for Verified Permissions except ``create-policy-store`` and ``list-policy-stores`` require that you specify the Id of the policy store you want to work with. ::

    aws verifiedpermissions list-policy-stores

Output::

    {
        "policyStores": [
            {
                "arn": "arn:aws:verifiedpermissions::123456789012:policy-store/PSEXAMPLEabcdefg111111",
                "createdDate": "2023-06-05T20:16:46.225598+00:00",
                "policyStoreId": "PSEXAMPLEabcdefg111111"
            },
            {
                "arn": "arn:aws:verifiedpermissions::123456789012:policy-store/PSEXAMPLEabcdefg222222",
                "createdDate": "2023-06-08T18:09:37.364356+00:00",
                "policyStoreId": "PSEXAMPLEabcdefg222222"
            },
            {
                "arn": "arn:aws:verifiedpermissions::123456789012:policy-store/PSEXAMPLEabcdefg333333",
                "createdDate": "2023-06-08T18:09:46.920600+00:00",
                "policyStoreId": "PSEXAMPLEabcdefg333333"
            }
        ]
    }

For more information about policy stores, see `Amazon Verified Permissions policy stores <https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/policy-stores.html>`__ in the *Amazon Verified Permissions User Guide*.