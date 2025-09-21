**To get a trace summary**

The following ``get-trace-summaries`` example retrieves IDs and metadata for traces available within a specified time frame. ::

    aws xray get-trace-summaries \
        --start-time 1568835392.0 \
        --end-time 1568835446.0
	
Output::

    [
        "http://scorekeep-env-1.123456789.us-east-2.elasticbeanstalk.com/api/move/VSAE93HF/GSSD2NTB/DP0PCC09",
        "http://scorekeep-env-1.123456789.us-east-2.elasticbeanstalk.com/api/move/GCQ2B35P/FREELDFT/4LRE643M",
        "http://scorekeep-env-1.123456789.us-east-2.elasticbeanstalk.com/api/game/VSAE93HF/GSSD2NTB/starttime/1568835513",
        "http://scorekeep-env-1.123456789.us-east-2.elasticbeanstalk.com/api/move/4MQNA5NN/L99KK2RF/null"
    ]

For more information, see `Using the AWS X-Ray API with the AWS CLI <https://docs.aws.amazon.com/xray/latest/devguide/xray-api-tutorial.html>`__ in the *AWS X-Ray Developer Guide*.
