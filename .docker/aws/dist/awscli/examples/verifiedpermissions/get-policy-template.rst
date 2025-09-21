**To retrieve details about a policy template**

The following ``get-policy-template`` example displays the details for the policy template with the specified ID. ::

    aws verifiedpermissions get-policy-template \
        --policy-template-id  PTEXAMPLEabcdefg111111 \
        --policy-store-id PSEXAMPLEabcdefg111111

Output::

    {
        "createdDate": "2023-06-12T20:47:42.804511+00:00",
        "lastUpdatedDate": "2023-06-12T20:47:42.804511+00:00",
        "policyStoreId": "PSEXAMPLEabcdefg111111",
        "policyTemplateId": "PTEXAMPLEabcdefg111111",
        "statement": "permit(\n    principal in ?principal,\n    action == Action::\"view\",\n    resource == Photo::\"VacationPhoto94.jpg\"\n);"
    }

For more information about policy templates, see `Amazon Verified Permissions policy templates <https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/policy-templates.html>`__ in the *Amazon Verified Permissions User Guide*.