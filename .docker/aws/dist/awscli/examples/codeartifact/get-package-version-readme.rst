**To get a package version's readme file**

The following ``get-package-version-readme`` example retrieves the readme file for version 4.0.0 of an npm package named test-package. ::

    aws codeartifact get-package-version-readme \
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
        "readme": "<div align=\"center\">\n   <a href=\https://github.com/test-package/testpack\"> ... more content ... \n",
        "versionRevision": "Ciqe5/9yicvkJT13b5/LdLpCyE6fqA7poa9qp+FilPs="
    }

For more information, see `View package version readme file <https://docs.aws.amazon.com/codeartifact/latest/ug/describe-package-version.html#view-package-readme>`__ in the *AWS CodeArtifact User Guide*.