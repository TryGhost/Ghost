**To add an attachment to a set**

The following ``add-attachments-to-set`` example adds an image to a set that you can then specify for a support case in your AWS account. ::

    aws support add-attachments-to-set \
        --attachment-set-id "as-2f5a6faa2a4a1e600-mu-nk5xQlBr70-G1cUos5LZkd38KOAHZa9BMDVzNEXAMPLE" \
        --attachments fileName=troubleshoot-screenshot.png,data=base64-encoded-string 

Output::

    {
        "attachmentSetId": "as-2f5a6faa2a4a1e600-mu-nk5xQlBr70-G1cUos5LZkd38KOAHZa9BMDVzNEXAMPLE",
        "expiryTime": "2020-05-14T17:04:40.790+0000"
    }

For more information, see `Case management <https://docs.aws.amazon.com/awssupport/latest/user/case-management.html>`__ in the *AWS Support User Guide*.