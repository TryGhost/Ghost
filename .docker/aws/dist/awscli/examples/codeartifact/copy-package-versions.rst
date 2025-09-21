
**To copy package versions from one repository to another**

The following ``copy-package-versions`` moves versions 4.0.0 and 5.0.0 of a package named test-package from my-repo to test-repo. ::

    aws codeartifact copy-package-versions \
        --domain test-domain \
        --source-repository my-repo \
        --destination-repository test-repo \
        --format npm \
        --package test-package \
        --versions '["4.0.0", "5.0.0"]'

Output::

    {  
        "format": "npm",
        "package": "test-package",
        "versions": [
            {
            "version": "5.0.0",
            "revision": "REVISION-1-SAMPLE-6C81EFF7DA55CC",
            "status": "Published"
            },
            {
            "version": "4.0.0",
            "revision": "REVISION-2-SAMPLE-55C752BEE772FC",
            "status": "Published"
            }
        ]
    }

For more information, see `Copy packages between repositories <https://docs.aws.amazon.com/codeartifact/latest/ug/copy-package.html>`__ in the *AWS CodeArtifact User Guide*.

