**To create a custom authorizer**

The following ``create-authorizer`` example creates a custom authorizer that uses the specified Lambda function as part of a custom authentication service. ::

    aws iot create-authorizer \
        --authorizer-name "CustomAuthorizer" \
        --authorizer-function-arn "arn:aws:lambda:us-west-2:123456789012:function:CustomAuthorizerFunction" \
        --token-key-name "MyAuthToken" \
        --status ACTIVE \
        --token-signing-public-keys FIRST_KEY="-----BEGIN PUBLIC KEY-----
 MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1uJOB4lQPgG/lM6ZfIwo
 Z+7ENxAio9q6QD4FFqjGZsvjtYwjoe1RKK0U8Eq9xb5O3kRSmyIwTzwzm/f4Gf0Y
 ZUloJ+t3PUUwHrmbYTAgTrCUgRFygjfgVwGCPs5ZAX4Eyqt5cr+AIHIiUDbxSa7p
 zwOBKPeic0asNJpqT8PkBbRaKyleJh5oo81NDHHmVtbBm5A5YiJjqYXLaVAowKzZ
 +GqsNvAQ9Jy1wI2VrEa1OfL8flDB/BJLm7zjpfPOHDJQgID0XnZwAlNnZcOhCwIx
 50g2LW2Oy9R/dmqtDmJiVP97Z4GykxPvwlYHrUXY0iW1R3AR/Ac1NhCTGZMwVDB1
 lQIDAQAB
 -----END PUBLIC KEY-----"

Output::

    {
        "authorizerName": "CustomAuthorizer",
        "authorizerArn": "arn:aws:iot:us-west-2:123456789012:authorizer/CustomAuthorizer2"
    }

For more information, see `CreateAuthorizer <https://docs.aws.amazon.com/iot/latest/apireference/API_CreateAuthorizer.html>`__ in the *AWS IoT API Reference*.
