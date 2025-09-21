**To retrieve details about a policy**

The following ``get-policy`` example displays the details for the policy with the specified ID. ::

    aws verifiedpermissions get-policy \
        --policy-id PSEXAMPLEabcdefg111111 \
        --policy-store-id PSEXAMPLEabcdefg111111

Output::

    {
        "createdDate": "2023-06-12T20:33:37.382907+00:00",
        "definition": {
            "static": {
                "description": "Grant everyone of janeFriends UserGroup access to the vacationFolder Album",
                "statement": "permit(principal in UserGroup::\"janeFriends\", action, resource in Album::\"vacationFolder\" );"
            }
        },
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