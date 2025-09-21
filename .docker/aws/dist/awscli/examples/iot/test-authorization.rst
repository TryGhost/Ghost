**To test your AWS IoT policies**

The following ``test-authorization`` example tests the AWS IoT policies associated with the specified principal. ::

    aws iot test-authorization \
        --auth-infos actionType=CONNECT,resources=arn:aws:iot:us-east-1:123456789012:client/client1 \
        --principal arn:aws:iot:us-west-2:123456789012:cert/aab1068f7f43ac3e3cae4b3a8aa3f308d2a750e6350507962e32c1eb465d9775

Output::

    {
        "authResults": [
            {
                "authInfo": {
                    "actionType": "CONNECT",
                    "resources": [
                        "arn:aws:iot:us-east-1:123456789012:client/client1"
                    ]
                },
                "allowed": {
                    "policies": [
                        {
                            "policyName": "TestPolicyAllowed",
                            "policyArn": "arn:aws:iot:us-west-2:123456789012:policy/TestPolicyAllowed"
                        }
                    ]
                },
                "denied": {
                    "implicitDeny": {
                        "policies": [
                            {
                                "policyName": "TestPolicyDenied",
                                "policyArn": "arn:aws:iot:us-west-2:123456789012:policy/TestPolicyDenied"
                            }
                        ]
                    },
                    "explicitDeny": {
                        "policies": [
                            {
                                "policyName": "TestPolicyExplicitDenied",
                                "policyArn": "arn:aws:iot:us-west-2:123456789012:policy/TestPolicyExplicitDenied"
                            }
                        ]
                    }
                },
                "authDecision": "IMPLICIT_DENY",
                "missingContextValues": []
            }
        ]
    }

For more information, see `TestAuthorization <https://docs.aws.amazon.com/iot/latest/apireference/API_TestAuthorization.html>`__ in the *AWS IoT API Reference*.
