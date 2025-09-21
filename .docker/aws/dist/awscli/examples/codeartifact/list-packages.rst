**To list packages in a repository**

The following ``list-packages`` example list packages in a repository named ``test-repo`` in a domain named ``test-domain``. ::

    aws codeartifact list-packages \
        --domain test-domain \
        --repository test-repo

Output::

    {
        "packages": [
            {
                "format": "npm",
                "package": "lodash"
            }
            {
                "format": "python",
                "package": "test-package"
            }
        ]
    }

For more information, see `List package names <https://docs.aws.amazon.com/codeartifact/latest/ug/list-packages.html>`__ in the *AWS CodeArtifact User Guide*.