**To view a package version's dependencies**

The following ``list-package-version-dependencies`` example retrieves the dependencies for version 4.0.0 of an npm package named test-package. ::

    aws codeartifact list-package-version-dependencies \
        --domain test-domain \
        --repo test-repo \
        --format npm \
        --package test-package \
        --package-version 4.0.0

Output::

    {
        "format": "npm",
        "package": "test-package",
        "version": "4.0.0",
        "versionRevision": "Ciqe5/9yicvkJT13b5/LdLpCyE6fqA7poa9qp+FilPs=",
        "dependencies": [
            {
                "namespace": "testns",
                "package": "testdep1",
                "dependencyType": "regular",
                "versionRequirement": "1.8.5"
            },
            {
                "namespace": "testns",
                "package": "testdep2",
                "dependencyType": "regular",
                "versionRequirement": "1.8.5"
            }
        ]
    }

For more information, see `View and update package version details and dependencies <https://docs.aws.amazon.com/codeartifact/latest/ug/describe-package-version.html>`__ in the *AWS CodeArtifact User Guide*.