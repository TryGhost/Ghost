**To set an attribute for a topic**

The following ``set-topic-attributes`` example sets the ``DisplayName`` attribute for the specified topic. ::

    aws sns set-topic-attributes \
        --topic-arn arn:aws:sns:us-west-2:123456789012:MyTopic \
        --attribute-name DisplayName \
        --attribute-value MyTopicDisplayName

This command produces no output.
