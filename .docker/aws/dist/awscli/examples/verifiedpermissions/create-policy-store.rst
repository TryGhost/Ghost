**To create a policy store**

The following ``create-policy-store`` example creates a policy store in the current AWS Region. ::

    aws verifiedpermissions create-policy-store \
        --validation-settings "mode=STRICT"

Output::

    {
        "arn": "arn:aws:verifiedpermissions::123456789012:policy-store/PSEXAMPLEabcdefg111111",
        "createdDate": "2023-05-16T17:41:29.103459+00:00",
        "lastUpdatedDate": "2023-05-16T17:41:29.103459+00:00",
        "policyStoreId": "PSEXAMPLEabcdefg111111"
    }

For more information about policy stores, see `Amazon Verified Permissions policy stores <https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/policy-stores.html>`__ in the *Amazon Verified Permissions User Guide*.