**To get the permissions policy document for a repository**

The following ``get-repository-permissions-policy`` example gets the permission policy attached to a repository named test-repo. ::

    aws codeartifact get-repository-permissions-policy \
        --domain test-domain \
        --repository test-repo

Output::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::111122223333:root"
                },
                "Action": [
                    "codeartifact:DescribePackageVersion",
                    "codeartifact:DescribeRepository",
                    "codeartifact:GetPackageVersionReadme",
                    "codeartifact:GetRepositoryEndpoint",
                    "codeartifact:ListPackages",
                    "codeartifact:ListPackageVersions",
                    "codeartifact:ListPackageVersionAssets",
                    "codeartifact:ListPackageVersionDependencies",
                    "codeartifact:ReadFromRepository"
                ],
                "Resource": "*"
            }
        ]
    }

For more information, see `Read a policy <https://docs.aws.amazon.com/codeartifact/latest/ug/repo-policies.html#setting-a-policy>`__ in the *AWS CodeArtifact User Guide*.