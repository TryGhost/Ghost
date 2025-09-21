**To get the permissions policy document for a domain**

The following ``get-domain-permissions-policy`` example gets the permission policy attached to a domain named test-domain. ::

    aws codeartifact get-domain-permissions-policy \
        --domain test-domain

Output::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "BasicDomainPolicy",
                "Action": [
                    "codeartifact:GetDomainPermissionsPolicy",
                    "codeartifact:ListRepositoriesInDomain",
                    "codeartifact:GetAuthorizationToken",
                    "codeartifact:CreateRepository"
                ],
                "Effect": "Allow",
                "Resource": "*",
                "Principal": {
                    "AWS": "arn:aws:iam::111122223333:root"
                }
            }
        ]
    }

For more information, see `Read a domain policy <https://docs.aws.amazon.com/codeartifact/latest/ug/domain-policies.html#reading-a-domain-policy>`__ in the *AWS CodeArtifact User Guide*.