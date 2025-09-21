**To create a policy template**

The following ``create-policy-template`` example creates a policy template with a statement that contains a placeholder for the principal. ::

    aws verifiedpermissions create-policy-template \
        --statement file://template1.txt \
        --policy-store-id PSEXAMPLEabcdefg111111

Contents of ``template1.txt``::

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