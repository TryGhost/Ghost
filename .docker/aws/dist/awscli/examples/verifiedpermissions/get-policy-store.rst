**To retrieve details about a policy store**

The following ``get-policy-store`` example displays the details for the policy store with the specified Id. ::

    aws verifiedpermissions get-policy-store \
        --policy-store-id PSEXAMPLEabcdefg111111

Output::

    {
        "arn": "arn:aws:verifiedpermissions::123456789012:policy-store/PSEXAMPLEabcdefg111111",
        "createdDate": "2023-06-05T20:16:46.225598+00:00",
        "lastUpdatedDate": "2023-06-08T20:40:23.173691+00:00",
        "policyStoreId": "PSEXAMPLEabcdefg111111",
        "validationSettings": { "mode": "OFF" }
    }

For more information about policy stores, see `Amazon Verified Permissions policy stores <https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/policy-stores.html>`__ in the *Amazon Verified Permissions User Guide*.