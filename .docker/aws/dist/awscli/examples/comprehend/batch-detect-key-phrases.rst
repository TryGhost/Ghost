**To detect key phrases of multiple text inputs**

The following ``batch-detect-key-phrases`` example analyzes multiple input texts and returns the key noun phrases of each. The pre-trained model's confidence score for each prediction is also output. :: 

    aws comprehend batch-detect-key-phrases \
        --language-code en \
        --text-list "Hello Zhang Wei, I am John, writing to you about the trip for next Saturday." "Dear Jane, Your AnyCompany Financial Services LLC credit card account 1111-XXXX-1111-XXXX has a minimum payment of $24.53 that is due by July 31st." "Please send customer feedback to Sunshine Spa, 123 Main St, Anywhere or to Alice at AnySpa@example.com."

Output::

    {
        "ResultList": [
            {
                "Index": 0,
                "KeyPhrases": [
                    {
                        "Score": 0.99700927734375,
                        "Text": "Zhang Wei",
                        "BeginOffset": 6,
                        "EndOffset": 15
                    },
                    {
                        "Score": 0.9929308891296387,
                        "Text": "John",
                        "BeginOffset": 22,
                        "EndOffset": 26
                    },
                    {
                        "Score": 0.9997230172157288,
                        "Text": "the trip",
                        "BeginOffset": 49,
                        "EndOffset": 57
                    },
                    {
                        "Score": 0.9999470114707947,
                        "Text": "next Saturday",
                        "BeginOffset": 62,
                        "EndOffset": 75
                    }
                ]
            },
            {
                "Index": 1,
                "KeyPhrases": [
                    {
                        "Score": 0.8358274102210999,
                        "Text": "Dear Jane",
                        "BeginOffset": 0,
                        "EndOffset": 9
                    },
                    {
                        "Score": 0.989359974861145,
                        "Text": "Your AnyCompany Financial Services",
                        "BeginOffset": 11,
                        "EndOffset": 45
                    },
                    {
                        "Score": 0.8812323808670044,
                        "Text": "LLC credit card account 1111-XXXX-1111-XXXX",
                        "BeginOffset": 47,
                        "EndOffset": 90
                    },
                    {
                        "Score": 0.9999381899833679,
                        "Text": "a minimum payment",
                        "BeginOffset": 95,
                        "EndOffset": 112
                    },
                    {
                        "Score": 0.9997439980506897,
                        "Text": ".53",
                        "BeginOffset": 116,
                        "EndOffset": 119
                    },
                    {
                        "Score": 0.996875524520874,
                        "Text": "July 31st",
                        "BeginOffset": 135,
                        "EndOffset": 144
                    }
                ]
            },
            {
                "Index": 2,
                "KeyPhrases": [
                    {
                        "Score": 0.9990295767784119,
                        "Text": "customer feedback",
                        "BeginOffset": 12,
                        "EndOffset": 29
                    },
                    {
                        "Score": 0.9994127750396729,
                        "Text": "Sunshine Spa",
                        "BeginOffset": 33,
                        "EndOffset": 45
                    },
                    {
                        "Score": 0.9892991185188293,
                        "Text": "123 Main St",
                        "BeginOffset": 47,
                        "EndOffset": 58
                    },
                    {
                        "Score": 0.9969810843467712,
                        "Text": "Alice",
                        "BeginOffset": 75,
                        "EndOffset": 80
                    },
                    {
                        "Score": 0.9703696370124817,
                        "Text": "AnySpa@example.com",
                        "BeginOffset": 84,
                        "EndOffset": 99
                    }
                ]
            }
        ],
        "ErrorList": []
    }

For more information, see `Key Phrases <https://docs.aws.amazon.com/comprehend/latest/dg/how-key-phrases.html>`__ in the *Amazon Comprehend Developer Guide*.