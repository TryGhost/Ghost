**To get a list of traces** 

The following ``batch-get-traces`` example retrieves a list of traces specified by an ID. The full trace includes a document for each segment, compiled from all of the segment documents received with the same trace ID. ::

    aws xray batch-get-traces \
        --trace-ids 1-5d82881a-0a9126e92a73e971eed891b9

Output::

    {
        "Traces": [
            {
                "Id": "1-5d82881a-0a9126e92a73e971eed891b9",
                "Duration": 0.232,
                "Segments": [
                    {
                        "Id": "54aff5735b12dd28",
                        "Document": "{\"id\":\"54aff5735b12dd28\",\"name\":\"Scorekeep\",\"start_time\":1.568835610432E9,\"end_time\":1.568835610664E9,\"http\":{\"request\":{\"url\":\"http://scorekeep-env-1.m4fg2pfzpv.us-east-2.elasticbeanstalk.com/api/user\",\"method\":\"POST\",\"user_agent\":\"curl/7.59.0\",\"client_ip\":\"52.95.4.28\",\"x_forwarded_for\":true},\"response\":{\"status\":200}},\"aws\":{\"elastic_beanstalk\":{\"version_label\":\"Sample Application-1\",\"deployment_id\":3,\"environment_name\":\"Scorekeep-env-1\"},\"ec2\":{\"availability_zone\":\"us-east-2b\",\"instance_id\":\"i-0e3cf4d2de0f3f37a\"},\"xray\":{\"sdk_version\":\"1.1.0\",\"sdk\":\"X-Ray for Java\"}},\"service\":{\"runtime\":\"OpenJDK 64-Bit Server VM\",\"runtime_version\":\"1.8.0_222\"},\"trace_id\":\"1-5d82881a-0a9126e92a73e971eed891b9\",\"origin\":\"AWS::ElasticBeanstalk::Environment\",\"subsegments\":[{\"id\":\"2d6900034ccfe558\",\"name\":\"DynamoDB\",\"start_time\":1.568835610658E9,\"end_time\":1.568835610664E9,\"http\":{\"response\":{\"status\":200,\"content_length\":61}},\"aws\":{\"table_name\":\"scorekeep-user\",\"operation\":\"UpdateItem\",\"request_id\":\"TPEIDNDUROMLPOV17U4A79555NVV4KQNSO5AEMVJF66Q9ASUAAJG\",\"resource_names\":[\"scorekeep-user\"]},\"namespace\":\"aws\"}]}"
                    },
                    {
                        "Id": "0f278b6334c34e6b",
                        "Document": "{\"id\":\"0f278b6334c34e6b\",\"name\":\"DynamoDB\",\"start_time\":1.568835610658E9,\"end_time\":1.568835610664E9,\"parent_id\":\"2d6900034ccfe558\",\"inferred\":true,\"http\":{\"response\":{\"status\":200,\"content_length\":61}},\"aws\":{\"table_name\":\"scorekeep-user\",\"operation\":\"UpdateItem\",\"request_id\":\"TPEIDNDUROMLPOV17U4A79555NVV4KQNSO5AEMVJF66Q9ASUAAJG\",\"resource_names\":[\"scorekeep-user\"]},\"trace_id\":\"1-5d82881a-0a9126e92a73e971eed891b9\",\"origin\":\"AWS::DynamoDB::Table\"}"
                    }
                ]
            }
        ],
        "UnprocessedTraceIds": []
    }

For more information, see `Using the AWS X-Ray API with the AWS CLI <https://docs.aws.amazon.com/xray/latest/devguide/xray-api-tutorial.html>`__ in the *AWS X-Ray Developer Guide*.
