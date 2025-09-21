**Example 1: Configure a trail to log management events and data events by using advanced event selectors**

You can add advanced event selectors, and conditions for your advanced event selectors, up to a maximum of 500 values for all conditions and selectors on a trail. You can use advanced event selectors to log all available data event types. You can use either advanced event selectors or basic event selectors, but not both. If you apply advanced event selectors to a trail, any existing basic event selectors are overwritten. 

The following ``put-event-selectors`` example creates an advanced event selector for a trail named ``myTrail`` to log all management events, log S3 PutObject and DeleteObject API calls for all but one S3 bucket, log data API calls for a Lambda function named ``myFunction``, and log Publish API calls on an SNS topic named ``myTopic``. ::

    aws cloudtrail put-event-selectors \
        --trail-name myTrail \
        --advanced-event-selectors '[{"Name": "Log all management events", "FieldSelectors": [{ "Field": "eventCategory", "Equals": ["Management"] }] },{"Name": "Log PutObject and DeleteObject events for all but one bucket","FieldSelectors": [{ "Field": "eventCategory", "Equals": ["Data"] },{ "Field": "resources.type", "Equals": ["AWS::S3::Object"] },{ "Field": "eventName", "Equals": ["PutObject","DeleteObject"] },{ "Field": "resources.ARN", "NotStartsWith": ["arn:aws:s3:::amzn-s3-demo-bucket/"] }]},{"Name": "Log data events for a specific Lambda function","FieldSelectors": [{ "Field": "eventCategory", "Equals": ["Data"] },{ "Field": "resources.type", "Equals": ["AWS::Lambda::Function"] },{ "Field": "resources.ARN", "Equals": ["arn:aws:lambda:us-east-1:123456789012:function:myFunction"] }]},{"Name": "Log all Publish API calls on a specific SNS topic","FieldSelectors": [{ "Field": "eventCategory", "Equals": ["Data"] },{ "Field": "resources.type", "Equals": ["AWS::SNS::Topic"] },{ "Field": "eventName", "Equals": ["Publish"] },{ "Field": "resources.ARN", "Equals": ["arn:aws:sns:us-east-1:123456789012:myTopic.fifo"] }]}]'

Output::

    {
        "TrailARN": "arn:aws:cloudtrail:us-east-1:123456789012:trail/myTrail",
        "AdvancedEventSelectors": [
            {
                "Name": "Log all management events",
                "FieldSelectors": [
                    {
                        "Field": "eventCategory",
                        "Equals": [
                            "Management"
                        ]
                    }
                ]
            },
            {
                "Name": "Log PutObject and DeleteObject events for all but one bucket",
                "FieldSelectors": [
                    {
                        "Field": "eventCategory",
                        "Equals": [
                            "Data"
                        ]
                    },
                    {
                        "Field": "resources.type",
                        "Equals": [
                            "AWS::S3::Object"
                        ]
                    },
                    {
                        "Field": "eventName",
                        "Equals": [
                            "PutObject",
                            "DeleteObject"
                        ]
                    },
                    {
                        "Field": "resources.ARN",
                        "NotStartsWith": [
                            "arn:aws:s3:::amzn-s3-demo-bucket/"
                        ]
                    }
                ]
            },
            {
                "Name": "Log data events for a specific Lambda function",
                "FieldSelectors": [
                    {
                        "Field": "eventCategory",
                        "Equals": [
                            "Data"
                        ]
                    },
                    {
                        "Field": "resources.type",
                        "Equals": [
                            "AWS::Lambda::Function"
                        ]
                    },
                    {
                        "Field": "resources.ARN",
                        "Equals": [
                            "arn:aws:lambda:us-east-1:123456789012:function:myFunction"
                        ]
                    }
                ]
            },
            {
                "Name": "Log all Publish API calls on a specific SNS topic",
                "FieldSelectors": [
                    {
                        "Field": "eventCategory",
                        "Equals": [
                            "Data"
                        ]
                    },
                    {
                        "Field": "resources.type",
                        "Equals": [
                            "AWS::SNS::Topic"
                        ]
                    },
                    {
                        "Field": "eventName",
                        "Equals": [
                            "Publish"
                        ]
                    },
                    {
                        "Field": "resources.ARN",
                        "Equals": [
                            "arn:aws:sns:us-east-1:123456789012:myTopic.fifo"
                        ]
                    }
                ]
            }
        ]
    }

For more information, see `Log events by using advanced event selectors <https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html#creating-data-event-selectors-advanced>`__ in the *AWS CloudTrail User Guide*. 

**Example 2: Configure event selectors for a trail to log all management events and data events**

You can configure up to 5 event selectors for a trail and up to 250 data resources for a trail. Event selectors are also referred to as basic event selectors. You can use event selectors to log management events and data events for S3 objects, Lambda functions, and DynnamoDB tables. To log data events for other resource types, you must use advanced event selectors.

The following ``put-event-selectors`` example creates an event selector for a trail named ``TrailName`` to include all management events, data events for two Amazon S3 bucket/prefix combinations, and data events for a single AWS Lambda function named ``hello-world-python-function``. ::

    aws cloudtrail put-event-selectors \
        --trail-name TrailName \
        --event-selectors '[{"ReadWriteType": "All","IncludeManagementEvents": true,"DataResources": [{"Type":"AWS::S3::Object", "Values": ["arn:aws:s3:::amzn-s3-demo-bucket/prefix","arn:aws:s3:::amzn-s3-demo-bucket2/prefix2"]},{"Type": "AWS::Lambda::Function","Values": ["arn:aws:lambda:us-west-2:999999999999:function:hello-world-python-function"]}]}]'

Output::

    {
        "EventSelectors": [
            {
                "IncludeManagementEvents": true,
                "DataResources": [
                    {
                        "Values": [
                            "arn:aws:s3:::amzn-s3-demo-bucket/prefix",
                            "arn:aws:s3:::amzn-s3-demo-bucket2/prefix2"
                        ],
                        "Type": "AWS::S3::Object"
                    },
                    {
                        "Values": [
                            "arn:aws:lambda:us-west-2:123456789012:function:hello-world-python-function"
                        ],
                        "Type": "AWS::Lambda::Function"
                    },
                ],
                "ReadWriteType": "All"
            }
        ],
        "TrailARN": "arn:aws:cloudtrail:us-east-2:123456789012:trail/TrailName"
    }

For more information, see `Log events by using basic event selectors <https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html#creating-data-event-selectors-basic>`__ in the *AWS CloudTrail User Guide*. 

**Example 3: Configure event selectors for a trail to log management events, all S3 data events on S3 objects, and all Lambda data events on functions in your account**

The following ``put-event-selectors`` example creates an event selector for a trail named ``TrailName2`` that includes all management events, and all data events for all Amazon S3 buckets and AWS Lambda functions in the AWS account. ::

    aws cloudtrail put-event-selectors \
        --trail-name TrailName2 \
        --event-selectors '[{"ReadWriteType": "All","IncludeManagementEvents": true,"DataResources": [{"Type":"AWS::S3::Object", "Values": ["arn:aws:s3"]},{"Type": "AWS::Lambda::Function","Values": ["arn:aws:lambda"]}]}]'

Output::

    {
        "EventSelectors": [
            {
                "IncludeManagementEvents": true,
                "DataResources": [
                    {
                        "Values": [
                            "arn:aws:s3"
                        ],
                        "Type": "AWS::S3::Object"
                    },
                    {
                        "Values": [
                            "arn:aws:lambda"
                        ],
                        "Type": "AWS::Lambda::Function"
                    },
                ],
                "ReadWriteType": "All"
            }
        ],
        "TrailARN": "arn:aws:cloudtrail:us-east-2:123456789012:trail/TrailName2"
    }

For more information, see `Log events by using basic event selectors <https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html#creating-data-event-selectors-basic>`__ in the *AWS CloudTrail User Guide*.
