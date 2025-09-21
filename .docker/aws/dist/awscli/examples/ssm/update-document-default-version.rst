**To update the default version of a document**

The following ``update-document-default-version`` example updates the default version of a Systems Manager document. ::

    aws ssm update-document-default-version \
        --name "Example" \
        --document-version "2"

Output::

    {
        "Description": {
            "Name": "Example",
            "DefaultVersion": "2"
        }
    }

For more information, see `Writing SSM Document Content <https://docs.aws.amazon.com/systems-manager/latest/userguide/create-ssm-doc.html#writing-ssm-doc-content>`__ in the *AWS Systems Manager User Guide*.
