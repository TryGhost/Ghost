**To get information about a custom authorizer**

The following ``describe-authorizer`` example displays details for the specified custom authorizer. ::

    aws iot describe-authorizer \
        --authorizer-name CustomAuthorizer

Output::

    {
        "authorizerDescription": {
            "authorizerName": "CustomAuthorizer",
            "authorizerArn": "arn:aws:iot:us-west-2:123456789012:authorizer/CustomAuthorizer",
            "authorizerFunctionArn": "arn:aws:lambda:us-west-2:123456789012:function:CustomAuthorizerFunction",
            "tokenKeyName": "MyAuthToken",
            "tokenSigningPublicKeys": {
                "FIRST_KEY": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1uJOB4lQPgG/lM6ZfIwo\nZ+7ENxAio9q6QD4FFqjGZsvjtYwjoe1RKK0U8Eq9xb5O3kRSmyIwTzwzm/f4Gf0Y\nZUloJ+t3PUUwHrmbYTAgTrCUgRFygjfgVwGCPs5ZAX4Eyqt5cr+AIHIiUDbxSa7p\nzwOBKPeic0asNJpqT8PkBbRaKyleJh5oo81NDHHmVtbBm5A5YiJjqYXLaVAowKzZ\n+GqsNvAQ9Jy1wI2VrEa1OfL8flDB/BJLm7zjpfPOHDJQgID0XnZwAlNnZcOhCwIx\n50g2LW2Oy9R/dmqtDmJiVP97Z4GykxPvwlYHrUXY0iW1R3AR/Ac1NhCTGZMwVDB1\nlQIDAQAB\n-----END PUBLIC KEY-----"
            },
            "status": "ACTIVE",
            "creationDate": 1571245658.069,
            "lastModifiedDate": 1571245658.069
        }
    }

For more information, see `DescribeAuthorizer <https://docs.aws.amazon.com/iot/latest/apireference/API_DescribeAuthorizer.html>`__ in the *AWS IoT API Reference*.
