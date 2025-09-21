**To upload a segment**

The following ``put-trace-segments`` example uploads segment documents to AWS X-Ray. The segment document is consumed as a list of JSON segment documents. ::

    aws xray put-trace-segments \
        --trace-segment-documents "{\"id\":\"20312a0e2b8809f4\",\"name\":\"DynamoDB\",\"trace_id\":\"1-5832862d-a43aafded3334a971fe312db\",\"start_time\":1.479706157195E9,\"end_time\":1.479706157202E9,\"parent_id\":\"79736b962fe3239e\",\"http\":{\"response\":{\"content_length\":60,\"status\":200}},\"inferred\":true,\"aws\":{\"consistent_read\":false,\"table_name\":\"scorekeep-session-xray\",\"operation\":\"GetItem\",\"request_id\":\"SCAU23OM6M8FO38UASGC7785ARVV4KQNSO5AEMVJF66Q9ASUAAJG\",\"resource_names\":[\"scorekeep-session-xray\"]},\"origin\":\"AWS::DynamoDB::Table\"}"

Output::

    {
        "UnprocessedTraceSegments": []
    }

For more information, see `Sending Trace Data to AWS X-Ray <https://docs.aws.amazon.com/en_pv/xray/latest/devguide/xray-api-sendingdata.html#xray-api-segments>`__ in the *AWS X-Ray Developer Guide*.
