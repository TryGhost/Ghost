**To list the repository associations in your AWS account**

The following ``list-repository-associations`` example returns a list of repository association summary objects in your account. You can filter the returned list by ``ProviderType``, ``Name``, ``State``, and ``Owner``. ::

    aws codeguru-reviewer list-repository-associations

Output::

    {
        "RepositoryAssociationSummaries": [
            {
                "LastUpdatedTimeStamp": 1595886609.616,
                "Name": "test",
                "AssociationId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "Owner": "sample-owner",
                "State": "Associated",
                "AssociationArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "ProviderType": "Bitbucket"
            },
            {
                "LastUpdatedTimeStamp": 1595636969.035,
                "Name": "CodeDeploy-CodePipeline-ECS-Tutorial",
                "AssociationId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "Owner": "123456789012",
                "State": "Associated",
                "AssociationArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "ProviderType": "CodeCommit"
            },
            {
                "LastUpdatedTimeStamp": 1595634785.983,
                "Name": "My-ecs-beta-repo",
                "AssociationId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "Owner": "123456789012",
                "State": "Associated",
                "AssociationArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "ProviderType": "CodeCommit"
            },
            {
                "LastUpdatedTimeStamp": 1590712811.77,
                "Name": "MyTestCodeCommit",
                "AssociationId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE44444",
                "Owner": "123456789012",
                "State": "Associated",
                "AssociationArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE44444",
                "ProviderType": "CodeCommit"
            },
            {
                "LastUpdatedTimeStamp": 1588102637.649,
                "Name": "aws-codeguru-profiler-sample-application",
                "AssociationId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE55555",
                "Owner": "sample-owner",
                "State": "Associated",
                "AssociationArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE55555",
                "ProviderType": "GitHub"
            },
            {
                "LastUpdatedTimeStamp": 1588028233.995,
                "Name": "codeguru-profiler-demo-app",
                "AssociationId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE66666",
                "Owner": "sample-owner",
                "State": "Associated",
                "AssociationArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE66666",
                "ProviderType": "GitHub"
            }
        ]
    }

For more information, see `View all repository associations in CodeGuru Reviewer <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/repository-association-view-all.html>`__ in the *Amazon CodeGuru Reviewer User Guide*.
