
**To delete package versions**

The following ``delete-package-versions`` example deletes version 4.0.0 of a package named test-package. ::

    aws codeartifact delete-package-versions \
        --domain test-domain \
        --repo test-repo \
        --format npm \
        --package test-package \
        --versions 4.0.0

Output::

    {
        "successfulVersions": {
            "4.0.0": {
                "revision": "Ciqe5/9yicvkJT13b5/LdLpCyE6fqA7poa9qp+FilPs=",
                "status": "Deleted"
            }
        },
        "failedVersions": {}
    }

For more information, see `Delete a package version <https://docs.aws.amazon.com/codeartifact/latest/ug/delete-package.html>`__ in the *AWS CodeArtifact User Guide*.