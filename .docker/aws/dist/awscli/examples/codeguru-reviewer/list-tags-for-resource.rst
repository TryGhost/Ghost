**To list the tags on an associated repository**

The following ``list-tags-for-resource`` lists the tags on an associated repository. This associated repository has two tags. ::

    aws codeguru-reviewer list-tags-for-resource \
        --resource-arn arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "Tags": {
            "Status": "Secret",
            "Team": "Saanvi"
        }
    }

For more information, see `View tags for a CodeGuru Reviewer associated repository (AWS CLI) <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/how-to-tag-associated-repository-view-cli.html>`__ in the *Amazon CodeGuru Reviewer User Guide*.