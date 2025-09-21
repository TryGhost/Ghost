**To view a package version's assets**

The following ``list-package-version-assets`` example retrieves the assets for version 4.0.0 of an npm package named test-package. ::

    aws codeartifact list-package-version-assets \
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
        "assets": [
            {
                "name": "package.tgz",
                "size": 316680,
                "hashes": {
                    "MD5": "60078ec6d9e76b89fb55c860832742b2",
                    "SHA-1": "b44a9b6297bcb698f1c51a3545a2b3b368d59c52",
                    "SHA-256": "d2aa8c6afc3c8591765785a37d1c5acae482a8eb3ab9729ed28922692454f2e2",
                    "SHA-512": "3e585d15c8a594e20d7de57b362ea81754c011acb2641a19f1b72c8531ea39825896bab344ae616a0a5a824cb9a381df0b3cddd534645cf305aba70a93dac698"
                }
            }
        ]
    }

For more information, see `List package version assets <https://docs.aws.amazon.com/codeartifact/latest/ug/list-assets.html>`__ in the *AWS CodeArtifact User Guide*.