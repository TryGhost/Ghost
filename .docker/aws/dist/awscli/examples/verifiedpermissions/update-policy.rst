**To update a static policy**

The following ``update-policy`` example modifies an existing static policy by updating its description and statement. ::

    aws verifiedpermissions update-policy \
        --policy-id SPEXAMPLEabcdefg111111 \
        --definition file://updated-definition.txt \
        --policy-store-id PSEXAMPLEabcdefg111111

The ``statement`` parameter takes a string representation of a JSON object. It contains embedded quotation marks (") within the outermost quotation mark pair. This requires you to convert the JSON to a string by preceding all embedded quotation marks with a backslash character ( \" ) and combining all lines into a single text line with no line breaks.

You can display example strings wrapped across multiple lines for readability, but the operation requires the parameters to be submitted as single-line strings.

Contents of file ``updated-definition.txt``::

    {
        "static": {
            "description": "Updated policy to grant janeFriends UserGroup access to the vacationFolder Album with view action only",
            "statement": "permit(principal in UserGroup::\"janeFriends\", action == Action::\"view\", resource in Album::\"vacationFolder\" );"
        }
    }

Output::

    {
        "createdDate": "2023-06-12T20:33:37.382907+00:00",
        "lastUpdatedDate": "2023-06-12T20:33:37.382907+00:00",
        "policyId": "SPEXAMPLEabcdefg111111",
        "policyStoreId": "PSEXAMPLEabcdefg111111",
        "policyType": "STATIC",
        "principal": {
            "entityId": "janeFriends",
            "entityType": "UserGroup"
        },
        "resource": {
            "entityId": "vacationFolder",
            "entityType": "Album"
        }
    }

For more information about policies, see `Amazon Verified Permissions policies <https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/policies.html>`__ in the *Amazon Verified Permissions User Guide*.
