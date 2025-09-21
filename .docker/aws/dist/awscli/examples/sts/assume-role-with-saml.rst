**To get short-term credentials for a role authenticated with SAML**

The following ``assume-role-with-saml`` command retrieves a set of short-term credentials for the  IAM role ``TestSaml``. The request in this example is authenticated by using the SAML assertion supplied by your identity provider when you authenticate to it. ::

    aws sts assume-role-with-saml \
        --role-arn arn:aws:iam::123456789012:role/TestSaml \
        --principal-arn arn:aws:iam::123456789012:saml-provider/SAML-test \
        --saml-assertion "VERYLONGENCODEDASSERTIONEXAMPLExzYW1sOkF1ZGllbmNlPmJsYW5rPC9zYW1sOkF1ZGllbmNlPjwvc2FtbDpBdWRpZW5jZVJlc3RyaWN0aW9uPjwvc2FtbDpDb25kaXRpb25zPjxzYW1sOlN1YmplY3Q+PHNhbWw6TmFtZUlEIEZvcm1hdD0idXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOm5hbWVpZC1mb3JtYXQ6dHJhbnNpZW50Ij5TYW1sRXhhbXBsZTwvc2FtbDpOYW1lSUQ+PHNhbWw6U3ViamVjdENvbmZpcm1hdGlvbiBNZXRob2Q9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpjbTpiZWFyZXIiPjxzYW1sOlN1YmplY3RDb25maXJtYXRpb25EYXRhIE5vdE9uT3JBZnRlcj0iMjAxOS0xMS0wMVQyMDoyNTowNS4xNDVaIiBSZWNpcGllbnQ9Imh0dHBzOi8vc2lnbmluLmF3cy5hbWF6b24uY29tL3NhbWwiLz48L3NhbWw6U3ViamVjdENvbmZpcm1hdGlvbj48L3NhbWw6U3ViamVjdD48c2FtbDpBdXRoblN0YXRlbWVudCBBdXRoPD94bWwgdmpSZXNwb25zZT4="

Output::

    {
        "Issuer": "https://integ.example.com/idp/shibboleth</Issuer",
        "AssumedRoleUser": {
            "Arn": "arn:aws:sts::123456789012:assumed-role/TestSaml",
            "AssumedRoleId": "ARO456EXAMPLE789:TestSaml"
        },
        "Credentials": {
            "AccessKeyId": "ASIAV3ZUEFP6EXAMPLE",
            "SecretAccessKey": "8P+SQvWIuLnKhh8d++jpw0nNmQRBZvNEXAMPLEKEY",
            "SessionToken": "IQoJb3JpZ2luX2VjEOz////////////////////wEXAMPLEtMSJHMEUCIDoKK3JH9uGQE1z0sINr5M4jk+Na8KHDcCYRVjJCZEvOAiEA3OvJGtw1EcViOleS2vhs8VdCKFJQWPQrmGdeehM4IC1NtBmUpp2wUE8phUZampKsburEDy0KPkyQDYwT7WZ0wq5VSXDvp75YU9HFvlRd8Tx6q6fE8YQcHNVXAkiY9q6d+xo0rKwT38xVqr7ZD0u0iPPkUL64lIZbqBAz+scqKmlzm8FDrypNC9Yjc8fPOLn9FX9KSYvKTr4rvx3iSIlTJabIQwj2ICCR/oLxBA==",
            "Expiration": "2019-11-01T20:26:47Z"
        },
        "Audience": "https://signin.aws.amazon.com/saml",
        "SubjectType": "transient",
        "PackedPolicySize": "6",
        "NameQualifier": "SbdGOnUkh1i4+EXAMPLExL/jEvs=",
        "Subject": "SamlExample"
    }

For more information, see `Requesting Temporary Security Credentials <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_request.html#api_assumerolewithsaml>`__ in the *AWS IAM User Guide*.
