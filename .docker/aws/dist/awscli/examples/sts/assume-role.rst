**To assume a role**

The following ``assume-role`` command retrieves a set of short-term credentials for the IAM role ``s3-access-example``. ::

    aws sts assume-role \
        --role-arn arn:aws:iam::123456789012:role/xaccounts3access \
        --role-session-name s3-access-example

Output::

    {
        "AssumedRoleUser": {
            "AssumedRoleId": "AROA3XFRBF535PLBIFPI4:s3-access-example",
            "Arn": "arn:aws:sts::123456789012:assumed-role/xaccounts3access/s3-access-example"
        },
        "Credentials": {
            "SecretAccessKey": "9drTJvcXLB89EXAMPLELB8923FB892xMFI",
            "SessionToken": "AQoXdzELDDY//////////wEaoAK1wvxJY12r2IrDFT2IvAzTCn3zHoZ7YNtpiQLF0MqZye/qwjzP2iEXAMPLEbw/m3hsj8VBTkPORGvr9jM5sgP+w9IZWZnU+LWhmg+a5fDi2oTGUYcdg9uexQ4mtCHIHfi4citgqZTgco40Yqr4lIlo4V2b2Dyauk0eYFNebHtYlFVgAUj+7Indz3LU0aTWk1WKIjHmmMCIoTkyYp/k7kUG7moeEYKSitwQIi6Gjn+nyzM+PtoA3685ixzv0R7i5rjQi0YE0lf1oeie3bDiNHncmzosRM6SFiPzSvp6h/32xQuZsjcypmwsPSDtTPYcs0+YN/8BRi2/IcrxSpnWEXAMPLEXSDFTAQAM6Dl9zR0tXoybnlrZIwMLlMi1Kcgo5OytwU=",
            "Expiration": "2016-03-15T00:05:07Z",
            "AccessKeyId": "ASIAJEXAMPLEXEG2JICEA"
        }
    }

The output of the command contains an access key, secret key, and session token that you can use to authenticate to AWS.

For AWS CLI use, you can set up a named profile associated with a role. When you use the profile, the AWS CLI will call assume-role and manage credentials for you. For more information, see `Use an IAM role in the AWS CLI <https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html>`__ in the *AWS CLI User Guide*.