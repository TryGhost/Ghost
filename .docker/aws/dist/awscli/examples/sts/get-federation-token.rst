**To return a set of temporary security credentials using IAM user access key credentials**

The following ``get-federation-token`` example returns a set of temporary security credentials (consisting of an access key ID, a secret access key, and a security token) for a user. You must call the ``GetFederationToken`` operation using the long-term security credentials of an IAM user. ::

    aws sts get-federation-token \
        --name Bob \
        --policy file://myfile.json \
        --policy-arns arn=arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess \
        --duration-seconds 900

Contents of ``myfile.json``::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": "ec2:Describe*",
                "Resource": "*"
            },
            {
                "Effect": "Allow",
                "Action": "elasticloadbalancing:Describe*",
                "Resource": "*"
            },
            {
                "Effect": "Allow",
                "Action": [
                    "cloudwatch:ListMetrics",
                    "cloudwatch:GetMetricStatistics",
                    "cloudwatch:Describe*"
                ],
                "Resource": "*"
            },
            {
                "Effect": "Allow",
                "Action": "autoscaling:Describe*",
                "Resource": "*"
            }
        ]
    }

Output::

    {
        "Credentials": {
            "AccessKeyId": "ASIAIOSFODNN7EXAMPLE",
            "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            "SessionToken": "EXAMPLEpZ2luX2VjEGoaCXVzLXdlc3QtMiJIMEYCIQC/W9pL5ArQyDD5JwFL3/h5+WGopQ24GEXweNctwhi9sgIhAMkg+MZE35iWM8s4r5Lr25f9rSTVPFH98G42QQunWMTfKq0DCOP//////////wEQAxoMNDUyOTI1MTcwNTA3Igxuy3AOpuuoLsk3MJwqgQPg8QOd9HuoClUxq26wnc/nm+eZLjHDyGf2KUAHK2DuaS/nrGSEXAMPLE",
            "Expiration": "2023-12-20T02:06:07+00:00"
        },
        "FederatedUser": {
            "FederatedUserId": "111122223333:Bob",
            "Arn": "arn:aws:sts::111122223333:federated-user/Bob"
        },
        "PackedPolicySize": 36
    }

For more information, see `Requesting Temporary Security Credentials <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_request.html#api_getfederationtoken>`__ in the *AWS IAM User Guide*.
