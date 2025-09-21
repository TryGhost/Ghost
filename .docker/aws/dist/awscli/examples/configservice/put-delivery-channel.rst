**To create a delivery channel**

The following command provides the settings for the delivery channel as JSON code::

    aws configservice put-delivery-channel --delivery-channel file://deliveryChannel.json

The ``deliveryChannel.json`` file specifies the delivery channel attributes::

    {
        "name": "default",
        "s3BucketName": "config-bucket-123456789012",
        "snsTopicARN": "arn:aws:sns:us-east-1:123456789012:config-topic",
        "configSnapshotDeliveryProperties": {
            "deliveryFrequency": "Twelve_Hours"
        }
    }

This example sets the following attributes:

- ``name`` - The name of the delivery channel. By default, AWS Config assigns the name ``default`` to a new delivery channel.

  You cannot update the delivery channel name with the ``put-delivery-channel`` command. For the steps to change the name, see `Renaming the Delivery Channel`__. 

  .. __: http://docs.aws.amazon.com/config/latest/developerguide/update-dc.html#update-dc-rename

- ``s3BucketName`` - The name of the Amazon S3 bucket to which AWS Config delivers configuration snapshots and configuration history files.

  If you specify a bucket that belongs to another AWS account, that bucket must have policies that grant access permissions to AWS Config. For more information, see `Permissions for the Amazon S3 Bucket`__.

.. __: http://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-policy.html

- ``snsTopicARN`` - The Amazon Resource Name (ARN) of the Amazon SNS topic to which AWS Config sends notifications about configuration changes.

  If you choose a topic from another account, the topic must have policies that grant access permissions to AWS Config. For more information, see `Permissions for the Amazon SNS Topic`__.

.. __: http://docs.aws.amazon.com/config/latest/developerguide/sns-topic-policy.html

- ``configSnapshotDeliveryProperties`` - Contains the ``deliveryFrequency`` attribute, which sets how often AWS Config delivers configuration snapshots and how often it invokes evaluations for periodic Config rules.

If the command succeeds, AWS Config returns no output. To verify the settings of your delivery channel, run the `describe-delivery-channels`__ command.

.. __: http://docs.aws.amazon.com/cli/latest/reference/configservice/describe-delivery-channels.html