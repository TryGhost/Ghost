**Example: To view approval history and status for a change template**

The following ``list-document-metadata-history`` example returns the approval history for the specified Change Manager change template. ::

    aws ssm list-document-metadata-history \
        --name MyChangeManageTemplate \
        --metadata DocumentReviews

Output::

    {
        "Name": "MyChangeManagerTemplate",
        "DocumentVersion": "1",
        "Author": "arn:aws:iam::111222333444;:user/JohnDoe",
        "Metadata": {
            "ReviewerResponse": [
                {
                    "CreateTime": "2021-07-30T11:58:28.025000-07:00",
                    "UpdatedTime": "2021-07-30T12:01:19.274000-07:00",
                    "ReviewStatus": "APPROVED",
                    "Comment": [
                        {
                            "Type": "COMMENT",
                            "Content": "I approve this template version"
                        }
                    ],
                    "Reviewer": "arn:aws:iam::111222333444;:user/ShirleyRodriguez"
                },
                {
                    "CreateTime": "2021-07-30T11:58:28.025000-07:00",
                    "UpdatedTime": "2021-07-30T11:58:28.025000-07:00",
                    "ReviewStatus": "PENDING"
                }
            ]
        }
    }

For more information, see `Reviewing and approving or rejecting change templates <https://docs.aws.amazon.com/systems-manager/latest/userguide/change-templates-review.html>`__ in the *AWS Systems Manager User Guide*.