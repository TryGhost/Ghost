**To describe document permissions**

The following ``describe-document-permission`` example displays permission details about a Systems Manager document that is shared publicly. ::

    aws ssm describe-document-permission \
        --name "Example" \
        --permission-type "Share"

Output::

    {
        "AccountIds": [
            "all"
        ],
        "AccountSharingInfoList": [
            {
                "AccountId": "all",
                "SharedDocumentVersion": "$DEFAULT"
            }
        ]
    }    

For more information, see `Share a Systems Manager Document <https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-how-to-share.html>`__ in the *AWS Systems Manager User Guide*.
