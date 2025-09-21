**To get an asset from a package version**

The following ``get-package-version-asset`` example retrieves the ``package.tgz`` asset for version 4.0.0 of an npm package named test-package. ::

    aws codeartifact get-package-version-asset \
        --domain test-domain \
        --repository test-repo \
        --format npm \
        --package test-package \
        --package-version 4.0.0 \
        --asset 'package.tgz' \
        outfileName

Output::

    The output for this command will also store the raw asset in the file provided in place of outfileName.

    {
        "assetName": "package.tgz",
        "packageVersion": "4.0.0",
        "packageVersionRevision": "Ciqe5/9yicvkJT13b5/LdLpCyE6fqA7poa9qp+FilPs="
    }

For more information, see `List package version assets <https://docs.aws.amazon.com/codeartifact/latest/ug/list-assets.html>`__ in the *AWS CodeArtifact User Guide*.