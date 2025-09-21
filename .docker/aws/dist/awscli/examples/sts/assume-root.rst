**To launch a privileged session**

The following ``assume-root`` command retrieves a set of short-term credentials you can use to remove a misconfigured Amazon S3 bucket policy for a member account in your organization. ::

    aws sts assume-root \
        --duration-seconds 900 \
        --target-principal 111122223333 \
        --task-policy-arn arn=arn:aws:iam::aws:policy/root-task/S3UnlockBucketPolicy

Output::

    {
        "Credentials": {
            "SecretAccessKey": "9drTJvcXLB89EXAMPLELB8923FB892xMFI",
            "SessionToken": "AQoXdzELDDY//////////wEaoAK1wvxJY12r2IrDFT2IvAzTCn3zHoZ7YNtpiQLF0MqZye/qwjzP2iEXAMPLEbw/m3hsj8VBTkPORGvr9jM5sgP+w9IZWZnU+LWhmg+a5fDi2oTGUYcdg9uexQ4mtCHIHfi4citgqZTgco40Yqr4lIlo4V2b2Dyauk0eYFNebHtYlFVgAUj+7Indz3LU0aTWk1WKIjHmmMCIoTkyYp/k7kUG7moeEYKSitwQIi6Gjn+nyzM+PtoA3685ixzv0R7i5rjQi0YE0lf1oeie3bDiNHncmzosRM6SFiPzSvp6h/32xQuZsjcypmwsPSDtTPYcs0+YN/8BRi2/IcrxSpnWEXAMPLEXSDFTAQAM6Dl9zR0tXoybnlrZIwMLlMi1Kcgo5OytwU=",
            "Expiration": "2024-11-15T00:05:07Z",
            "AccessKeyId": "ASIAJEXAMPLEXEG2JICEA"
        },
        "SourceIdentity": "Alice",
    }

The output of the command contains an access key, secret key, and session token that you can use to  to perform privileged actions in the member account. For more information, see `Perform a privileged task on an AWS Organizations member account <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user-privileged-task.html>`__ in the *AWS IAM User Guide*.