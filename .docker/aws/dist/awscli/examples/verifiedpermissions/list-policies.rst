**To list the available policies**

The following ``list-policies`` example lists all policies in the specified policy store. ::

    aws verifiedpermissions list-policies \
        --policy-store-id PSEXAMPLEabcdefg111111

Output::

    {
        "policies": [
            {
                "createdDate": "2023-06-12T20:33:37.382907+00:00",
                "definition": {
                    "static": {
                        "description": "Grant everyone of janeFriends UserGroup access to the vacationFolder Album"
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
            },
            {
                "createdDate": "2023-06-12T20:39:44.975897+00:00",
                "definition": {
                    "static": {
                        "description": "Grant everyone access to the publicFolder Album"
                    }
                },
                "lastUpdatedDate": "2023-06-12T20:39:44.975897+00:00",
                "policyId": "SPEXAMPLEabcdefg222222",
                "policyStoreId": "PSEXAMPLEabcdefg111111",
                "policyType": "STATIC",
                "resource": {
                    "entityId": "publicFolder",
                    "entityType": "Album"
                }
            },
            {
                "createdDate": "2023-06-12T20:49:51.490211+00:00",
                "definition": {
                    "templateLinked": {
                        "policyTemplateId": "PTEXAMPLEabcdefg111111"
                    }
                },
                "lastUpdatedDate": "2023-06-12T20:49:51.490211+00:00",
                "policyId": "SPEXAMPLEabcdefg333333",
                "policyStoreId": "PSEXAMPLEabcdefg111111",
                "policyType": "TEMPLATE_LINKED",
                "principal": {
                    "entityId": "alice",
                    "entityType": "User"
                },
                "resource": {
                    "entityId": "VacationPhoto94.jpg",
                    "entityType": "Photo"
                }
            }
        ]
    }

For more information about policies, see `Amazon Verified Permissions policies <https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/policies.html>`__ in the *Amazon Verified Permissions User Guide*.