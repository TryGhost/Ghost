**To set platform application attributes**

The following ``set-platform-application-attributes`` example sets the ``EventDeliveryFailure`` attribute for the specified platform application to the ARN of the specified Amazon SNS topic. ::

    aws sns set-platform-application-attributes \
        --platform-application-arn arn:aws:sns:us-west-2:123456789012:app/GCM/MyApplication \
        --attributes EventDeliveryFailure=arn:aws:sns:us-west-2:123456789012:AnotherTopic

This command produces no output.
