**To disassociate a repository association**

The following ``disassociate-repository`` disassociates a repository association that is using an AWS CodeCommit repository. ::

    aws codeguru-reviewer disassociate-repository \
        --association-arn arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "RepositoryAssociation": {
            "AssociationId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "AssociationArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "Name": "my-repository",
            "Owner": "123456789012",
            "ProviderType": "CodeCommit",
            "State": "Disassociating",
            "LastUpdatedTimeStamp": 1618939174.759,
            "CreatedTimeStamp": 1595636947.096
        },
        "Tags": {
            "Status": "Secret",
            "Team": "Saanvi"
        }
    }

For more information, see `Disassociate a repository in CodeGuru Reviewer <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/disassociate-repository-association.html>`__ in the *Amazon CodeGuru Reviewer User Guide*.