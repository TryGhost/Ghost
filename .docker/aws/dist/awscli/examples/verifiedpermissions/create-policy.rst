**Example 1: To create a static policy**

The following ``create-policy`` example creates a static policy with a policy scope that specifies both a principal and a resource. ::

    aws verifiedpermissions create-policy \
        --definition file://definition1.txt \
        --policy-store-id PSEXAMPLEabcdefg111111

Contents of file ``definition1.txt``::

    {
        "static": {
            "description":  "Grant everyone of janeFriends UserGroup access to the vacationFolder Album",
            "statement": "permit(principal in UserGroup::\"janeFriends\", action, resource in Album::\"vacationFolder\" );"
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

**Example 2: To create a static policy that grants access to a resource to everyone**

The following ``create-policy`` example creates a static policy with a policy scope that specifies only a resource. ::

    aws verifiedpermissions create-policy \
        --definition file://definition2.txt \
        --policy-store-id PSEXAMPLEabcdefg111111

Contents of file ``definition2.txt``::

    {
        "static": {
            "description":  "Grant everyone access to the publicFolder Album",
            "statement": "permit(principal, action, resource in Album::\"publicFolder\");"
        }
    }

Output::

    {
        "createdDate": "2023-06-12T20:39:44.975897+00:00",
        "lastUpdatedDate": "2023-06-12T20:39:44.975897+00:00",
        "policyId": "PbfR73F8oh5MMfr9uRtFDB",
        "policyStoreId": "PSEXAMPLEabcdefg222222",
        "policyType": "STATIC",
        "resource": {
            "entityId": "publicFolder",
            "entityType": "Album"
        }
    }

**Example 3: To create a template-linked policy that is associated with the specified template**

The following ``create-policy`` example creates a template-linked policy using the specified policy template and associates the specified principal to use with the new template-linked policy. ::

    aws verifiedpermissions create-policy \
        --definition file://definition.txt \
        --policy-store-id PSEXAMPLEabcdefg111111

Contents of ``definition.txt``::

    {
        "templateLinked": {
            "policyTemplateId": "PTEXAMPLEabcdefg111111",
            "principal": {
                "entityType": "User",
                "entityId": "alice"
            }
        }
    }

Output::

    {
        "createdDate": "2023-06-12T20:49:51.490211+00:00",
        "lastUpdatedDate": "2023-06-12T20:49:51.490211+00:00",
        "policyId": "TPEXAMPLEabcdefg111111",
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

For more information about policies, see `Amazon Verified Permissions policies <https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/policies.html>`__ in the *Amazon Verified Permissions User Guide*.