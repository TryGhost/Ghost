**To update package version status**

The following ``update-package-versions-status`` example updates the status of version 4.0.0 of the test-package package to Archived. ::

    aws codeartifact update-package-versions-status \
        --domain test-domain \
        --repo test-repo \
        --format npm \
        --package test-package \
        --versions 4.0.0 \
        --target-status Archived

Output::

    {
        "successfulVersions": {
            "4.0.0": {
                "revision": "Ciqe5/9yicvkJT13b5/LdLpCyE6fqA7poa9qp+FilPs=",
                "status": "Archived"
            }
        },
        "failedVersions": {}
    }

For more information, see `Update package version status <https://docs.aws.amazon.com/codeartifact/latest/ug/describe-package-version.html#update-package-version-status>`__ in the *AWS CodeArtifact User Guide*.