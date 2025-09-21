**To save a schema to a policy store**

The following ``put-schema`` example creates or replaces the schema in the specified policy store.

The ``cedarJson`` parameter in the input file takes a string representation of a JSON object. It contains embedded quotation marks (") within the outermost quotation mark pair. This requires you to convert the JSON to a string by preceding all embedded quotation marks with a backslash character ( \" ) and combining all lines into a single text line with no line breaks.

Example strings can be displayed wrapped across multiple lines here for readability, but the operation requires the parameters be submitted as single line strings.

    aws verifiedpermissions put-schema \
        --definition file://schema.txt \
        --policy-store-id PSEXAMPLEabcdefg111111

Contents of ``schema.txt``::

    {
        "cedarJson": "{\"MySampleNamespace\": {\"actions\": {\"remoteAccess\": {
                \"appliesTo\": {\"principalTypes\": [\"Employee\"]}}},\"entityTypes\": {
                \"Employee\": {\"shape\": {\"attributes\": {\"jobLevel\": {\"type\":
                \"Long\"},\"name\": {\"type\": \"String\"}},\"type\": \"Record\"}}}}}"
    }


Output::

    {
        "policyStoreId": "PSEXAMPLEabcdefg111111",
        "namespaces": [
            "MySampleNamespace"
        ],
        "createdDate": "2023-06-14T17:47:13.999885+00:00",
        "lastUpdatedDate": "2023-06-14T17:47:13.999885+00:00"
    }

For more information about schema, see `Policy store schema <https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/schema.html>`__ in the *Amazon Verified Permissions User Guide*.