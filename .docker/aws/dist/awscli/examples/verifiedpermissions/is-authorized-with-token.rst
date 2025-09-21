**Example 1: To request an authorization decision for a user request (allow)**

The following ``is-authorized-with-token`` example requests an authorization decision for a user who was authenticated by Amazon Cognito. The request uses the identity token provided by Cognito rather than the access token. In this example, the specified information store is configured to return principals as entities of type ``CognitoUser``. ::

    aws verifiedpermissions is-authorized-with-token \
        --action actionId="View",actionType="Action" \
        --resource entityId="vacationPhoto94.jpg",entityType="Photo" \
        --policy-store-id PSEXAMPLEabcdefg111111 \
        --identity-token "AbCdE12345...long.string...54321EdCbA"

The policy store contains a policy with the following statement that accepts identities from the specified Cognito user pool and application Id. ::

    permit(
        principal == CognitoUser::"us-east-1_1a2b3c4d5|a1b2c3d4e5f6g7h8i9j0kalbmc",
        action,
        resource == Photo::"VacationPhoto94.jpg"
    );

Output::

    {
        "decision":"Allow",
        "determiningPolicies":[
            {
            "determiningPolicyId":"SPEXAMPLEabcdefg111111"
            }
        ],
        "errors":[]
    }

For more information about using identities from a Cognito user pool,  see `Using Amazon Verified Permissions with identity providers <https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/identity-providers.html>`__ in the *Amazon Verified Permissions User Guide*.