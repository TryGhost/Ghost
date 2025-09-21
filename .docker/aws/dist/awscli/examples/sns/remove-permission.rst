**To remove a permission from a topic**

The following ``remove-permission`` example removes the permission ``Publish-Permission`` from the specified topic. ::

    aws sns remove-permission \
        --topic-arn arn:aws:sns:us-west-2:123456789012:MyTopic \
        --label Publish-Permission

This command produces no output.
