**To retrieve details about an identity source**

The following ``get-identity-source`` example displays the details for the identity source with the specified Id. ::

    aws verifiedpermissions get-identity-source \
        --identity-source  ISEXAMPLEabcdefg111111 \
        --policy-store-id PSEXAMPLEabcdefg111111

Output::

    {
        "createdDate": "2023-06-12T22:27:49.150035+00:00",
        "details": {
            "clientIds": [ "a1b2c3d4e5f6g7h8i9j0kalbmc" ],
            "discoveryUrl": "https://cognito-idp.us-west-2.amazonaws.com/us-west-2_1a2b3c4d5",
            "openIdIssuer": "COGNITO",
            "userPoolArn": "arn:aws:cognito-idp:us-west-2:123456789012:userpool/us-west-2_1a2b3c4d5"
        },
        "identitySourceId": "ISEXAMPLEabcdefg111111",
        "lastUpdatedDate": "2023-06-12T22:27:49.150035+00:00",
        "policyStoreId": "PSEXAMPLEabcdefg111111",
        "principalEntityType": "User"
    }

For more information about identity sources, see `Using Amazon Verified Permissions with identity providers <https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/identity-providers.html>`__ in the *Amazon Verified Permissions User Guide*.