**To detect entities from multiple input texts**

The following ``batch-detect-entities`` example analyzes multiple input texts and returns the named entities of each. The pre-trained model's confidence score is also output for each prediction. ::

    aws comprehend batch-detect-entities \
        --language-code en \
        --text-list "Dear Jane, Your AnyCompany Financial Services LLC credit card account 1111-XXXX-1111-XXXX has a minimum payment of $24.53 that is due by July 31st." "Please send customer feedback to Sunshine Spa, 123 Main St, Anywhere or to Alice at AnySpa@example.com."    

Output::

    {
        "ResultList": [
            {
                "Index": 0,
                "Entities": [
                    {
                        "Score": 0.9985517859458923,
                        "Type": "PERSON",
                        "Text": "Jane",
                        "BeginOffset": 5,
                        "EndOffset": 9
                    },
                    {
                        "Score": 0.9767839312553406,
                        "Type": "ORGANIZATION",
                        "Text": "AnyCompany Financial Services, LLC",
                        "BeginOffset": 16,
                        "EndOffset": 50
                    },
                    {
                        "Score": 0.9856694936752319,
                        "Type": "OTHER",
                        "Text": "1111-XXXX-1111-XXXX",
                        "BeginOffset": 71,
                        "EndOffset": 90
                    },
                    {
                        "Score": 0.9652159810066223,
                        "Type": "QUANTITY",
                        "Text": ".53",
                        "BeginOffset": 116,
                        "EndOffset": 119
                    },
                    {
                        "Score": 0.9986667037010193,
                        "Type": "DATE",
                        "Text": "July 31st",
                        "BeginOffset": 135,
                        "EndOffset": 144
                    }
                ]
            },
            {
                "Index": 1,
                "Entities": [
                    {
                        "Score": 0.720084547996521,
                        "Type": "ORGANIZATION",
                        "Text": "Sunshine Spa",
                        "BeginOffset": 33,
                        "EndOffset": 45
                    },
                    {
                        "Score": 0.9865870475769043,
                        "Type": "LOCATION",
                        "Text": "123 Main St",
                        "BeginOffset": 47,
                        "EndOffset": 58
                    },
                    {
                        "Score": 0.5895616412162781,
                        "Type": "LOCATION",
                        "Text": "Anywhere",
                        "BeginOffset": 60,
                        "EndOffset": 68
                    },
                    {
                        "Score": 0.6809214353561401,
                        "Type": "PERSON",
                        "Text": "Alice",
                        "BeginOffset": 75,
                        "EndOffset": 80
                    },
                    {
                        "Score": 0.9979087114334106,
                        "Type": "OTHER",
                        "Text": "AnySpa@example.com",
                        "BeginOffset": 84,
                        "EndOffset": 99
                    }
                ]
            }
        ],
        "ErrorList": []
    }

For more information, see `Entities <https://docs.aws.amazon.com/comprehend/latest/dg/how-entities.html>`__ in the *Amazon Comprehend Developer Guide*.