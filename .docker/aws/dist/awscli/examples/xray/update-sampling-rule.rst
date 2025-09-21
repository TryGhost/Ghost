**To update a sampling rule**

The following ``update-sampling-rule`` example modifies a sampling rule's configuration. The rules are consumed from a JSON file. Only the fields being updated are required. ::

     aws xray update-sampling-rule \
        --cli-input-json file://1000-default.json

Contents of ``1000-default.json``::

    {
        "SamplingRuleUpdate": {
            "RuleName": "Default",
            "FixedRate": 0.01,
            "ReservoirSize": 0
        }
    }

Output::

    {
        "SamplingRuleRecords": [
            {
                "SamplingRule": {
                    "RuleName": "Default",
                    "RuleARN": "arn:aws:xray:us-west-2:123456789012:sampling-rule/Default",
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
                "ModifiedAt": 1529959993.0
            }
       ]
    }

For more information, see `Configuring Sampling, Groups, and Encryption Settings with the AWS X-Ray API <https://docs.aws.amazon.com/en_pv/xray/latest/devguide/xray-api-configuration.html#xray-api-configuration-sampling>`__ in the *AWS X-Ray Developer Guide*.
