**To retrieve the schema in a policy store**

The following ``get-schema`` example displays the details of the schema in the specified policy store. ::

    aws verifiedpermissions get-schema \
        --policy-store-id PSEXAMPLEabcdefg111111

Output::

    {
        "policyStoreId": "PSEXAMPLEabcdefg111111",
        "schema": "{\"MySampleNamespace\":{\"entityTypes\":{\"Employee\":{\"shape\":{\"attributes\":{\"jobLevel\":{\"type\":\"Long\"},\"name\":{\"type\":\"String\"}},\"type\":\"Record\"}}},\"actions\":{\"remoteAccess\":{\"appliesTo\":{\"principalTypes\":[\"Employee\"]}}}}}",
        "createdDate": "2023-06-14T17:47:13.999885+00:00",
        "lastUpdatedDate": "2023-06-14T17:47:13.999885+00:00"
    }

For more information about schema, see `Policy store schema <https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/schema.html>`__ in the *Amazon Verified Permissions User Guide*.