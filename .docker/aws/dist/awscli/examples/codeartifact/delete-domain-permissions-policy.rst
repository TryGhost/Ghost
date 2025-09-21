**To delete the permissions policy document from a domain**

The following ``delete-domain-permissions-policy`` example deletes the permission policy from a domain named test-domain. ::

    aws codeartifact delete-domain-permissions-policy \
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

For more information, see `Delete a domain policy <https://docs.aws.amazon.com/codeartifact/latest/ug/domain-policies.html#deleting-a-domain-policy>`__ in the *AWS CodeArtifact User Guide*.