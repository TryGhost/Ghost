**Example 1: To return information about a GitHub repository association**

The following ``describe-repository-association`` example returns information about a repository association that uses a GitHub Enterprise repository and is in the ``Associated`` state. ::

    aws codeguru-reviewer describe-repository-association \
        --association-arn arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "RepositoryAssociation": {
            "AssociationId": "b822717e-0711-4e8a-bada-0e738289c75e",
            "Name": "mySampleRepo",
            "LastUpdatedTimeStamp": 1588102637.649,
            "ProviderType": "GitHub",
            "CreatedTimeStamp": 1588102615.636,
            "Owner": "sample-owner",
            "State": "Associated",
            "StateReason": "Pull Request Notification configuration successful",
            "AssociationArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
        }
    }

For more information, see `Create a GitHub Enterprise Server repository association in Amazon CodeGuru Reviewer <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/create-github-enterprise-association.html>`__ in the *Amazon CodeGuru Reviewer User Guide*.

**Example 2: To return information about a failed repository association**

The following ``describe-repository-association`` example returns information about a repository association that uses a GitHub Enterprise repository and is in the ``Failed`` state. ::

    aws codeguru-reviewer describe-repository-association \
        --association-arn arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "RepositoryAssociation": {
            "ProviderType": "GitHubEnterpriseServer",
            "Name": "mySampleRepo",
            "LastUpdatedTimeStamp": 1596217036.892,
            "AssociationId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "CreatedTimeStamp": 1596216896.979,
            "ConnectionArn": "arn:aws:codestar-connections:us-west-2:123456789012:connection/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
            "State": "Failed",
            "StateReason": "Failed, Please retry.",
            "AssociationArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
            "Owner": "sample-owner"
        }
    }

For more information, see `Create a GitHub Enterprise Server repository association in Amazon CodeGuru Reviewer <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/create-github-enterprise-association.html>`__ in the *Amazon CodeGuru Reviewer User Guide*.

**Example 3: To return information about a disassociating repository association**

The following ``describe-repository-association`` example returns information about a repository association that uses a GitHub Enterprise repository and is in the ``Disassociating`` state. ::

    aws codeguru-reviewer describe-repository-association \
        --association-arn arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "RepositoryAssociation": {
            "ProviderType": "GitHubEnterpriseServer",
            "Name": "mySampleRepo",
            "LastUpdatedTimeStamp": 1596217036.892,
            "AssociationId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "CreatedTimeStamp": 1596216896.979,
            "ConnectionArn": "arn:aws:codestar-connections:us-west-2:123456789012:connection/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
            "State": "Disassociating",
            "StateReason": "Source code access removal in progress",
            "AssociationArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
            "Owner": "sample-owner"
        }
    }

For more information, see `Create a GitHub Enterprise Server repository association in Amazon CodeGuru Reviewer <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/create-github-enterprise-association.html>`__ in the *Amazon CodeGuru Reviewer User Guide*.
