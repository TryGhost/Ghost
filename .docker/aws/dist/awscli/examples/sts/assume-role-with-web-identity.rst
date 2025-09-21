**To get short-term credentials for a role authenticated with Web Identity (OAuth 2."0)**

The following ``assume-role-with-web-identity`` command retrieves a set of short-term credentials for the IAM role ``app1``. The request is authenticated by using the web identity token supplied by the specified web identity provider. Two additional policies are applied to the session to further restrict what the user can do. The returned credentials expire one hour after they are generated. ::

    aws sts assume-role-with-web-identity \
        --duration-seconds 3600 \
        --role-session-name "app1" \
        --provider-id "www.amazon.com" \
        --policy-arns "arn:aws:iam::123456789012:policy/q=webidentitydemopolicy1","arn:aws:iam::123456789012:policy/webidentitydemopolicy2" \
        --role-arn arn:aws:iam::123456789012:role/FederatedWebIdentityRole \
        --web-identity-token "Atza%7CIQEBLjAsAhRFiXuWpUXuRvQ9PZL3GMFcYevydwIUFAHZwXZXXXXXXXXJnrulxKDHwy87oGKPznh0D6bEQZTSCzyoCtL_8S07pLpr0zMbn6w1lfVZKNTBdDansFBmtGnIsIapjI6xKR02Yc_2bQ8LZbUXSGm6Ry6_BG7PrtLZtj_dfCTj92xNGed-CrKqjG7nPBjNIL016GGvuS5gSvPRUxWES3VYfm1wl7WTI7jn-Pcb6M-buCgHhFOzTQxod27L9CqnOLio7N3gZAGpsp6n1-AJBOCJckcyXe2c6uD0srOJeZlKUm2eTDVMf8IehDVI0r1QOnTV6KzzAI3OY87Vd_cVMQ"

Output::

    {
        "SubjectFromWebIdentityToken": "amzn1.account.AF6RHO7KZU5XRVQJGXK6HB56KR2A",
        "Audience": "client.5498841531868486423.1548@apps.example.com",
        "AssumedRoleUser": {
            "Arn": "arn:aws:sts::123456789012:assumed-role/FederatedWebIdentityRole/app1",
            "AssumedRoleId": "AROACLKWSDQRAOEXAMPLE:app1"
        },
        "Credentials": {
            "AccessKeyId": "AKIAIOSFODNN7EXAMPLE",
            "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY",
            "SessionToken": "AQoEXAMPLEH4aoAH0gNCAPyJxz4BlCFFxWNE1OPTgk5TthT+FvwqnKwRcOIfrRh3c/LTo6UDdyJwOOvEVPvLXCrrrUtdnniCEXAMPLE/IvU1dYUg2RVAJBanLiHb4IgRmpRV3zrkuWJOgQs8IZZaIv2BXIa2R4OlgkBN9bkUDNCJiBeb/AXlzBBko7b15fjrBs2+cTQtpZ3CYWFXG8C5zqx37wnOE49mRl/+OtkIKGO7fAE",
            "Expiration": "2020-05-19T18:06:10+00:00"
        },
        "Provider": "www.amazon.com"
    }

For more information, see `Requesting Temporary Security Credentials <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_request.html#api_assumerolewithwebidentity>`__ in the *AWS IAM User Guide*.
