**To list the available policy templates**

The following ``list-policy-templates`` example lists all policy templates in the specified policy store. ::

    aws verifiedpermissions list-policy-templates \
        --policy-store-id PSEXAMPLEabcdefg111111

Output::

    {
        "policyTemplates": [
            {
                "createdDate": "2023-06-12T20:47:42.804511+00:00",
                "lastUpdatedDate": "2023-06-12T20:47:42.804511+00:00",
                "policyStoreId": "PSEXAMPLEabcdefg111111",
                "policyTemplateId": "PTEXAMPLEabcdefg111111"
            }
        ]
    }

For more information about policy templates, see `Amazon Verified Permissions policy templates <https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/policy-templates.html>`__ in the *Amazon Verified Permissions User Guide*.