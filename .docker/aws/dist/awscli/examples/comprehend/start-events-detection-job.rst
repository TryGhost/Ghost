**To start an asynchronous events detection job**

The following ``start-events-detection-job`` example starts an asynchronous events detection job for all files located at the address specified by
the ``--input-data-config`` tag. Possible target event types include ``BANKRUPCTY``, ``EMPLOYMENT``, ``CORPORATE_ACQUISITION``, ``INVESTMENT_GENERAL``, ``CORPORATE_MERGER``, ``IPO``, ``RIGHTS_ISSUE``,
``SECONDARY_OFFERING``, ``SHELF_OFFERING``, ``TENDER_OFFERING``, and ``STOCK_SPLIT``. The S3 bucket in this example contains ``SampleText1.txt``, ``SampleText2.txt``, and ``SampleText3.txt``. 
When the job is complete, the folder, ``output``, is placed in the location specified by the ``--output-data-config`` tag. The folder contains 
``SampleText1.txt.out``, ``SampleText2.txt.out``, and ``SampleText3.txt.out``. The JSON output is printed on one line per file, but is formatted here for readability. ::

    aws comprehend start-events-detection-job \
        --job-name events-detection-1 \
        --input-data-config "S3Uri=s3://amzn-s3-demo-bucket/EventsData" \
        --output-data-config "S3Uri=s3://amzn-s3-demo-destination-bucket/testfolder/" \
        --data-access-role-arn arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-servicerole \
        --language-code en \
        --target-event-types "BANKRUPTCY" "EMPLOYMENT" "CORPORATE_ACQUISITION" "CORPORATE_MERGER" "INVESTMENT_GENERAL"

Contents of ``SampleText1.txt``::

    "Company AnyCompany grew by increasing sales and through acquisitions. After purchasing competing firms in 2020, AnyBusiness, a part of the AnyBusinessGroup, gave Jane Does firm a going rate of one cent a gallon or forty-two cents a barrel."

Contents of ``SampleText2.txt``::

    "In 2021, AnyCompany officially purchased AnyBusiness for 100 billion dollars, surprising and exciting the shareholders."

Contents of ``SampleText3.txt``::

    "In 2022, AnyCompany stock crashed 50. Eventually later that year they filed for bankruptcy."

Output::

    {
        "JobId": "123456abcdeb0e11022f22a11EXAMPLE",
        "JobArn": "arn:aws:comprehend:us-west-2:111122223333:events-detection-job/123456abcdeb0e11022f22a11EXAMPLE",
        "JobStatus": "SUBMITTED"
    }

Contents of ``SampleText1.txt.out`` with line indents for readability::

    {
        "Entities": [
            {
            "Mentions": [
                {
                "BeginOffset": 8,
                "EndOffset": 18,
                "Score": 0.99977,
                "Text": "AnyCompany",
                "Type": "ORGANIZATION",
                "GroupScore": 1
                },
                {
                "BeginOffset": 112,
                "EndOffset": 123,
                "Score": 0.999747,
                "Text": "AnyBusiness",
                "Type": "ORGANIZATION",
                "GroupScore": 0.979826
                },
                {
                "BeginOffset": 171,
                "EndOffset": 175,
                "Score": 0.999615,
                "Text": "firm",
                "Type": "ORGANIZATION",
                "GroupScore": 0.871647
                }
            ]
            },
            {
            "Mentions": [
                {
                "BeginOffset": 97,
                "EndOffset": 102,
                "Score": 0.987687,
                "Text": "firms",
                "Type": "ORGANIZATION",
                "GroupScore": 1
                }
            ]
            },
            {
            "Mentions": [
                {
                "BeginOffset": 103,
                "EndOffset": 110,
                "Score": 0.999458,
                "Text": "in 2020",
                "Type": "DATE",
                "GroupScore": 1
                }
            ]
            },
            {
            "Mentions": [
                {
                "BeginOffset": 160,
                "EndOffset": 168,
                "Score": 0.999649,
                "Text": "John Doe",
                "Type": "PERSON",
                "GroupScore": 1
                }
            ]
            }
        ],
        "Events": [
            {
            "Type": "CORPORATE_ACQUISITION",
            "Arguments": [
                {
                "EntityIndex": 0,
                "Role": "INVESTOR",
                "Score": 0.99977
                }
            ],
            "Triggers": [
                {
                "BeginOffset": 56,
                "EndOffset": 68,
                "Score": 0.999967,
                "Text": "acquisitions",
                "Type": "CORPORATE_ACQUISITION",
                "GroupScore": 1
                }
            ]
            },
            {
            "Type": "CORPORATE_ACQUISITION",
            "Arguments": [
                {
                "EntityIndex": 1,
                "Role": "INVESTEE",
                "Score": 0.987687
                },
                {
                "EntityIndex": 2,
                "Role": "DATE",
                "Score": 0.999458
                },
                {
                "EntityIndex": 3,
                "Role": "INVESTOR",
                "Score": 0.999649
                }
            ],
            "Triggers": [
                {
                "BeginOffset": 76,
                "EndOffset": 86,
                "Score": 0.999973,
                "Text": "purchasing",
                "Type": "CORPORATE_ACQUISITION",
                "GroupScore": 1
                }
            ]
            }
        ],
        "File": "SampleText1.txt",
        "Line": 0
    }

Contents of ``SampleText2.txt.out``::

    {
        "Entities": [
            {
            "Mentions": [
                {
                "BeginOffset": 0,
                "EndOffset": 7,
                "Score": 0.999473,
                "Text": "In 2021",
                "Type": "DATE",
                "GroupScore": 1
                }
            ]
            },
            {
            "Mentions": [
                {
                "BeginOffset": 9,
                "EndOffset": 19,
                "Score": 0.999636,
                "Text": "AnyCompany",
                "Type": "ORGANIZATION",
                "GroupScore": 1
                }
            ]
            },
            {
            "Mentions": [
                {
                "BeginOffset": 45,
                "EndOffset": 56,
                "Score": 0.999712,
                "Text": "AnyBusiness",
                "Type": "ORGANIZATION",
                "GroupScore": 1
                }
            ]
            },
            {
            "Mentions": [
                {
                "BeginOffset": 61,
                "EndOffset": 80,
                "Score": 0.998886,
                "Text": "100 billion dollars",
                "Type": "MONETARY_VALUE",
                "GroupScore": 1
                }
            ]
            }
        ],
        "Events": [
            {
            "Type": "CORPORATE_ACQUISITION",
            "Arguments": [
                {
                "EntityIndex": 3,
                "Role": "AMOUNT",
                "Score": 0.998886
                },
                {
                "EntityIndex": 2,
                "Role": "INVESTEE",
                "Score": 0.999712
                },
                {
                "EntityIndex": 0,
                "Role": "DATE",
                "Score": 0.999473
                },
                {
                "EntityIndex": 1,
                "Role": "INVESTOR",
                "Score": 0.999636
                }
            ],
            "Triggers": [
                {
                "BeginOffset": 31,
                "EndOffset": 40,
                "Score": 0.99995,
                "Text": "purchased",
                "Type": "CORPORATE_ACQUISITION",
                "GroupScore": 1
                }
            ]
            }
        ],
        "File": "SampleText2.txt",
        "Line": 0
    }

Contents of ``SampleText3.txt.out``::

    {
        "Entities": [
            {
            "Mentions": [
                {
                "BeginOffset": 9,
                "EndOffset": 19,
                "Score": 0.999774,
                "Text": "AnyCompany",
                "Type": "ORGANIZATION",
                "GroupScore": 1
                },
                {
                "BeginOffset": 66,
                "EndOffset": 70,
                "Score": 0.995717,
                "Text": "they",
                "Type": "ORGANIZATION",
                "GroupScore": 0.997626
                }
            ]
            },
            {
            "Mentions": [
                {
                "BeginOffset": 50,
                "EndOffset": 65,
                "Score": 0.999656,
                "Text": "later that year",
                "Type": "DATE",
                "GroupScore": 1
                }
            ]
            }
        ],
        "Events": [
            {
            "Type": "BANKRUPTCY",
            "Arguments": [
                {
                "EntityIndex": 1,
                "Role": "DATE",
                "Score": 0.999656
                },
                {
                "EntityIndex": 0,
                "Role": "FILER",
                "Score": 0.995717
                }
            ],
            "Triggers": [
                {
                "BeginOffset": 81,
                "EndOffset": 91,
                "Score": 0.999936,
                "Text": "bankruptcy",
                "Type": "BANKRUPTCY",
                "GroupScore": 1
                }
            ]
            }
        ],
        "File": "SampleText3.txt",
        "Line": 0
    }

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.