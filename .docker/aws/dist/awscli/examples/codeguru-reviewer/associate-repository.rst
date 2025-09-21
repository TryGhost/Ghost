**Example 1: To create a Bitbucket repository association**

The following ``associate-repository`` example creates a repository association using an existing Bitbucket repository. ::

    aws codeguru-reviewer associate-repository \
        --repository 'Bitbucket={Owner=sample-owner, Name=mySampleRepo, ConnectionArn=arn:aws:codestar-connections:us-west-2:123456789012:connection/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 }'

Output::

    {
        "RepositoryAssociation": {
            "ProviderType": "Bitbucket",
            "Name": "mySampleRepo",
            "LastUpdatedTimeStamp": 1596216896.979,
            "AssociationId": "association:a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
            "CreatedTimeStamp": 1596216896.979,
            "ConnectionArn": "arn:aws:codestar-connections:us-west-2:123456789012:connection/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "State": "Associating",
            "StateReason": "Pending Repository Association",
            "AssociationArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
            "Owner": "sample-owner"
        }
    }

For more information, see `Create a Bitbucket repository association in Amazon CodeGuru Reviewer <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/create-bitbucket-association.html>`__ in the *Amazon CodeGuru Reviewer User Guide*.

**Example 2: To create a GitHub Enterprise repository association**

The following ``associate-repository`` example creates a repository association using an existing GitHub Enterprise repository. ::

    aws codeguru-reviewer associate-repository \
        --repository 'GitHubEnterpriseServer={Owner=sample-owner, Name=mySampleRepo, ConnectionArn=arn:aws:codestar-connections:us-west-2:123456789012:connection/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 }'

Output::

    {
        "RepositoryAssociation": {
            "ProviderType": "GitHubEnterpriseServer",
            "Name": "mySampleRepo",
            "LastUpdatedTimeStamp": 1596216896.979,
            "AssociationId": "association:a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
            "CreatedTimeStamp": 1596216896.979,
            "ConnectionArn": "arn:aws:codestar-connections:us-west-2:123456789012:connection/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "State": "Associating",
            "StateReason": "Pending Repository Association",
            "AssociationArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
            "Owner": "sample-owner"
        }
    }

For more information, see `Create a GitHub Enterprise Server repository association in Amazon CodeGuru Reviewer <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/create-github-enterprise-association.html>`__ in the *Amazon Codeguru Reviewer User Guide*.

**Example 3: To create an AWS CodeCommit repository association**

The following ``associate-repository`` example creates a repository association using an existing AWS CodeCommit repository. ::

    aws codeguru-reviewer associate-repository \
        --repository CodeCommit={Name=mySampleRepo}

Output::

    {
        "RepositoryAssociation": {
            "AssociationId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "Name": "My-ecs-beta-repo",
            "LastUpdatedTimeStamp": 1595634764.029,
            "ProviderType": "CodeCommit",
            "CreatedTimeStamp": 1595634764.029,
            "Owner": "544120495673",
            "State": "Associating",
            "StateReason": "Pending Repository Association",
            "AssociationArn": "arn:aws:codeguru-reviewer:us-west-2:544120495673:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
        }
    }

For more information, see `Create an AWS CodeCommit repository association in Amazon CodeGuru Reviewer <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/create-codecommit-association.html>`__ in the *Amazon CodeGuru Reviewer User Guide*.