**To retrieve all sampling rules**

The following ``get-sampling-rules`` example displays details for all available sampling rules.::

    aws xray get-sampling-rules
	
Output::

    {
        "SamplingRuleRecords": [
            {
                "SamplingRule": {
                    "RuleName": "Default",
                    "RuleARN": "arn:aws:xray:us-east-1::sampling-rule/Default",
                    "ResourceARN": "*",
                    "Priority": 10000,
                    "FixedRate": 0.01,
                    "ReservoirSize": 0,
                    "ServiceName": "*",
                    "ServiceType": "*",
                    "Host": "*",
                    "HTTPMethod": "*",
                    "URLPath": "*",
                    "Version": 1,
                    "Attributes": {}
                },
                "CreatedAt": 0.0,
                "ModifiedAt": 1530558121.0
            },
            {
                "SamplingRule": {
                    "RuleName": "base-scorekeep",
                    "RuleARN": "arn:aws:xray:us-east-1::sampling-rule/base-scorekeep",
                    "ResourceARN": "*",
                    "Priority": 9000,
                    "FixedRate": 0.1,
                    "ReservoirSize": 2,
                    "ServiceName": "Scorekeep",
                    "ServiceType": "*",
                    "Host": "*",
                    "HTTPMethod": "*",
                    "URLPath": "*",
                    "Version": 1,
                    "Attributes": {}
                },
                "CreatedAt": 1530573954.0,
                "ModifiedAt": 1530920505.0
            },
            {
                "SamplingRule": {
                    "RuleName": "polling-scorekeep",
                    "RuleARN": "arn:aws:xray:us-east-1::sampling-rule/polling-scorekeep",
                    "ResourceARN": "*",
                    "Priority": 5000,
                    "FixedRate": 0.003,
                    "ReservoirSize": 0,
                    "ServiceName": "Scorekeep",
                    "ServiceType": "*",
                    "Host": "*",
                    "HTTPMethod": "GET",
                    "URLPath": "/api/state/*",
                    "Version": 1,
                    "Attributes": {}
                },
                "CreatedAt": 1530918163.0,
                "ModifiedAt": 1530918163.0
            }
        ]
    }

For more information, see `Using Sampling Rules with the X-Ray API <https://docs.aws.amazon.com/en_pv/xray/latest/devguide/xray-api-sampling.html>`__ in the *AWS X-Ray Developer Guide*.
