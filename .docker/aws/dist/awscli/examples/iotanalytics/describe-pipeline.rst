**To retrieve information about a pipeline**

The following ``describe-pipeline`` example displays details for the specified pipeline. ::

    aws iotanalytics describe-pipeline \
        --pipeline-name mypipeline

Output::

    {
        "pipeline": {
            "activities": [
                {
                    "channel": {
                        "channelName": "mychannel",
                        "name": "mychannel_28",
                        "next": "mydatastore_29"
                    }
                },
                {
                    "datastore": {
                        "datastoreName": "mydatastore",
                        "name": "mydatastore_29"
                    }
                }
            ],
            "name": "mypipeline",
            "lastUpdateTime": 1561676362.515,
            "creationTime": 1557859124.432,
            "reprocessingSummaries": [
                {
                    "status": "SUCCEEDED",
                    "creationTime": 1561676362.189,
                    "id": "6ad2764f-fb13-4de3-b101-4e74af03b043"
                }
            ],
            "arn": "arn:aws:iotanalytics:us-west-2:123456789012:pipeline/mypipeline"
        }
    }

For more information, see `DescribePipeline <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_DescribePipeline.html>`__ in the *AWS IoT Analytics API Reference*.
