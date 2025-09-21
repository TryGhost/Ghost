**To add a tag to an associated repository**

The following ``tag-resource`` adds two tags to an associated repository ::

    aws codeguru-reviewer tag-resource \
        --resource-arn arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --tags Status=Secret,Team=Saanvi

This command produces no output.

For more information, see `Add a tag to a CodeGuru Reviewer associated repository (AWS CLI) <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/how-to-tag-associated-repository-add-cli.html>`__ and `Add or update tags for a CodeGuru Reviewer associated repository (AWS CLI) <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/how-to-tag-associated-repository-update-cli.html>`__ in the *Amazon CodeGuru Reviewer User Guide*.