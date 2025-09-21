**To list package versions for a package**

The following ``list-package-versions`` example returns a list of package versions for a package named ``kind-of``. ::

    aws codeartifact list-package-versions \
        --package kind-of \
        --domain test-domain \
        --repository test-repo \
        --format npm

Output::

    {
        "defaultDisplayVersion": "1.0.1",
        "format": "npm",
        "package": "kind-of",
        "versions": [
            {
                "version": "1.0.1",
                "revision": "REVISION-SAMPLE-1-C7F4S5E9B772FC",
                "status": "Published"
            },
            {
                "version": "1.0.0",
                "revision": "REVISION-SAMPLE-2-C752BEEF6D2CFC",
                "status": "Published"
            },
            {
                "version": "0.1.2",
                "revision": "REVISION-SAMPLE-3-654S65A5C5E1FC",
                "status": "Published"
            },
            {
                "version": "0.1.1",
                "revision": "REVISION-SAMPLE-1-C7F4S5E9B772FC"",
                "status": "Published"
            },
            {
                "version": "0.1.0",
                "revision": "REVISION-SAMPLE-4-AF669139B772FC",
                "status": "Published"
            }        
        ]
    }

For more information, see `List package versions <https://docs.aws.amazon.com/codeartifact/latest/ug/list-packages-versions.html>`__ in the *AWS CodeArtifact User Guide*.