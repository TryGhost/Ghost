**To create a custom queue**

The following ``create-queue`` example creates a custom transcoding queue. ::

    aws mediaconvert create-queue \
        --endpoint-url https://abcd1234.mediaconvert.region-name-1.amazonaws.com \
        --region region-name-1 \
        --name Queue1 \
        --description "Keep this queue empty unless job is urgent."

To get your account-specific endpoint, use ``describe-endpoints``, or send the command without the endpoint. The service returns an error and your endpoint.

Output::

    {
        "Queue": {
            "Status": "ACTIVE",
            "Name": "Queue1",
            "LastUpdated": 1518034928,
            "Arn": "arn:aws:mediaconvert:region-name-1:012345678998:queues/Queue1",
            "Type": "CUSTOM",
            "CreatedAt": 1518034928,
            "Description": "Keep this queue empty unless job is urgent."
        }
    }

For more information, see `Working with AWS Elemental MediaConvert Queues <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-queues.html>`_ in the *AWS Elemental MediaConvert User Guide*.
