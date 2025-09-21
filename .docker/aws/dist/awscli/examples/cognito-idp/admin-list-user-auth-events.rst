**To list authorization events for a user**

The following ``admin-list-user-auth-events`` example lists the most recent user activity log event for the user diego. ::

    aws cognito-idp admin-list-user-auth-events \
        --user-pool-id us-west-2_ywDJHlIfU \
        --username brcotter+050123 \
        --max-results 1

Output::

    {
        "AuthEvents": [
            {
                "EventId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "EventType": "SignIn",
                "CreationDate": 1726694203.495,
                "EventResponse": "InProgress",
                "EventRisk": {
                    "RiskDecision": "AccountTakeover",
                    "RiskLevel": "Medium",
                    "CompromisedCredentialsDetected": false
                },
                "ChallengeResponses": [
                    {
                        "ChallengeName": "Password",
                        "ChallengeResponse": "Success"
                    }
                ],
                "EventContextData": {
                    "IpAddress": "192.0.2.1",
                    "City": "Seattle",
                    "Country": "United States"
                }
            }
        ],
        "NextToken": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222#2024-09-18T21:16:43.495Z"
    }

For more information, see `Viewing and exporting user event history <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-settings-adaptive-authentication.html#user-pool-settings-adaptive-authentication-event-user-history>`__ in the *Amazon Cognito Developer Guide*.
