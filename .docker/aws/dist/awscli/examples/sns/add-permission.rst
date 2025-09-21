**To add a permission to a topic**

The following ``add-permission`` example adds the permission for AWS account ``987654321098`` to use the ``Publish`` action with the specified topic under AWS account ``123456789012``. ::

    aws sns add-permission \
        --topic-arn arn:aws:sns:us-west-2:123456789012:MyTopic \
        --label Publish-Permission \
        --aws-account-id 987654321098 \
        --action-name Publish

This command produces no output.
