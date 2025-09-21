**Example 1: To update a policy template**

The following ``update-policy-template`` example modifies the specified template-linked policy to replace its policy statement. ::

    aws verifiedpermissions update-policy-template \
        --policy-template-id PTEXAMPLEabcdefg111111 \
        --statement file://template1.txt \
        --policy-store-id PSEXAMPLEabcdefg111111

Contents of file ``template1.txt``::

    permit(
        principal in ?principal,
        action == Action::"view",
        resource == Photo::"VacationPhoto94.jpg"
    );

Output::

    {
        "createdDate": "2023-06-12T20:47:42.804511+00:00",
        "lastUpdatedDate": "2023-06-12T20:47:42.804511+00:00",
        "policyStoreId": "PSEXAMPLEabcdefg111111",
        "policyTemplateId": "PTEXAMPLEabcdefg111111"
    }

For more information about policy templates, see `Amazon Verified Permissions policy templates <https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/policy-templates.html>`__ in the *Amazon Verified Permissions User Guide*.