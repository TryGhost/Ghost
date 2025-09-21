**To delete a package version's assets and set its status to Disposed**

The following ``dispose-package-versions`` example deletes the assets of test-package version 4.0.0 and sets its status to Disposed. ::

    aws codeartifact dispose-package-versions \
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
                "status": "Disposed"
            }
        },
        "failedVersions": {}
    }

For more information, see `Working with packages in CodeArtifact <https://docs.aws.amazon.com/codeartifact/latest/ug/packages.html>`__ in the *AWS CodeArtifact User Guide*.

