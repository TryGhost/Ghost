**Create an IoT Analytics Pipeline**

The following ``create-pipeline`` example creates a pipeline. A pipeline consumes messages from a channel and allows you to process the messages before storing them in a data store. You must specify both a channel and a data store activity and, optionally, as many as 23 additional activities in the ``pipelineActivities`` array. ::

    aws iotanalytics create-pipeline \
        --cli-input-json file://create-pipeline.json

Contents of ``create-pipeline.json``::

    {
        "pipelineName": "mypipeline",
        "pipelineActivities": [
            {
                "channel": {
                    "name": "myChannelActivity",
                    "channelName": "mychannel",
                    "next": "myMathActivity"
                }
            },
            {
                "datastore": {
                    "name": "myDatastoreActivity",
                    "datastoreName": "mydatastore"
                }
            },
            {
                "math": {
                    "name": "myMathActivity",
                    "math": "((temp - 32) * 5.0) / 9.0",
                    "attribute": "tempC",
                    "next": "myDatastoreActivity"
                }
            }
        ],
        "tags": [
            {
                "key": "Environment",
                "value": "Beta"
            }
        ]
    }

Output::

    {
        "pipelineArn": "arn:aws:iotanalytics:us-west-2:123456789012:pipeline/mypipeline",
        "pipelineName": "mypipeline"
    }

For more information, see `CreatePipeline <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_CreatePipeline.html>`__ in the *AWS IoT Analytics API Reference*.
