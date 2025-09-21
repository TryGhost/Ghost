**Example 1: To request an authorization decision for a user request (allow)**

The following ``is-authorized`` example requests an authorization decision for a principal of type ``User`` named ``Alice``, who wants to perform the ``updatePhoto`` operation, on a resource of type ``Photo`` named ``VacationPhoto94.jpg``.

The response shows that the request is allowed by one policy. ::

    aws verifiedpermissions is-authorized \
        --principal entityType=User,entityId=alice \
        --action actionType=Action,actionId=view \
        --resource entityType=Photo,entityId=VactionPhoto94.jpg \
        --policy-store-id PSEXAMPLEabcdefg111111

Output::

    {
        "decision": "ALLOW",
        "determiningPolicies": [
            {
                "policyId": "SPEXAMPLEabcdefg111111"
            }
        ],
        "errors": []
    }

**Example 2: To request an authorization decision for a user request (deny)**

The following example is the same as the previous example, except that the principal is ``User::"Bob"``. The policy store doesn't contain any policy that allows that user access to ``Album::"alice_folder"``.

The output indicates that the ``Deny`` was implicit because the list of ``DeterminingPolicies`` is empty. ::

    aws verifiedpermissions create-policy \
        --definition file://definition2.txt \
        --policy-store-id PSEXAMPLEabcdefg111111

Output::

    {
        "decision": "DENY",
        "determiningPolicies": [],
        "errors": []
    }

For more information,  see the `Amazon Verified Permissions User Guide <https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/>`__.