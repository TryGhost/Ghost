**To detect the sentiment and each named entity for multiple input texts**

The following ``batch-detect-targeted-sentiment`` example analyzes multiple input texts and returns the named entities along with the prevailing sentiment attached to each entity. The pre-trained model's confidence score is also output for each prediction. ::

    aws comprehend batch-detect-targeted-sentiment \
        --language-code en \
        --text-list "That movie was really boring, the original was way more entertaining" "The trail is extra beautiful today." "My meal was just okay."

Output:: 

    {
        "ResultList": [
            {
                "Index": 0,
                "Entities": [
                    {
                        "DescriptiveMentionIndex": [
                            0
                        ],
                        "Mentions": [
                            {
                                "Score": 0.9999009966850281,
                                "GroupScore": 1.0,
                                "Text": "movie",
                                "Type": "MOVIE",
                                "MentionSentiment": {
                                    "Sentiment": "NEGATIVE",
                                    "SentimentScore": {
                                        "Positive": 0.13887299597263336,
                                        "Negative": 0.8057460188865662,
                                        "Neutral": 0.05525200068950653,
                                        "Mixed": 0.00012799999967683107
                                    }
                                },
                                "BeginOffset": 5,
                                "EndOffset": 10
                            }
                        ]
                    },
                    {
                        "DescriptiveMentionIndex": [
                            0
                        ],
                        "Mentions": [
                            {
                                "Score": 0.9921110272407532,
                                "GroupScore": 1.0,
                                "Text": "original",
                                "Type": "MOVIE",
                                "MentionSentiment": {
                                    "Sentiment": "POSITIVE",
                                    "SentimentScore": {
                                        "Positive": 0.9999989867210388,
                                        "Negative": 9.999999974752427e-07,
                                        "Neutral": 0.0,
                                        "Mixed": 0.0
                                    }
                                },
                                "BeginOffset": 34,
                                "EndOffset": 42
                            }
                        ]
                    }
                ]
            },
            {
                "Index": 1,
                "Entities": [
                    {
                        "DescriptiveMentionIndex": [
                            0
                        ],
                        "Mentions": [
                            {
                                "Score": 0.7545599937438965,
                                "GroupScore": 1.0,
                                "Text": "trail",
                                "Type": "OTHER",
                                "MentionSentiment": {
                                    "Sentiment": "POSITIVE",
                                    "SentimentScore": {
                                        "Positive": 1.0,
                                        "Negative": 0.0,
                                        "Neutral": 0.0,
                                        "Mixed": 0.0
                                    }
                                },
                                "BeginOffset": 4,
                                "EndOffset": 9
                            }
                        ]
                    },
                    {
                        "DescriptiveMentionIndex": [
                            0
                        ],
                        "Mentions": [
                            {
                                "Score": 0.9999960064888,
                                "GroupScore": 1.0,
                                "Text": "today",
                                "Type": "DATE",
                                "MentionSentiment": {
                                    "Sentiment": "NEUTRAL",
                                    "SentimentScore": {
                                        "Positive": 9.000000318337698e-06,
                                        "Negative": 1.9999999949504854e-06,
                                        "Neutral": 0.9999859929084778,
                                        "Mixed": 3.999999989900971e-06
                                    }
                                },
                                "BeginOffset": 29,
                                "EndOffset": 34
                            }
                        ]
                    }
                ]
            },
            {
                "Index": 2,
                "Entities": [
                    {
                        "DescriptiveMentionIndex": [
                            0
                        ],
                        "Mentions": [
                            {
                                "Score": 0.9999880194664001,
                                "GroupScore": 1.0,
                                "Text": "My",
                                "Type": "PERSON",
                                "MentionSentiment": {
                                    "Sentiment": "NEUTRAL",
                                    "SentimentScore": {
                                        "Positive": 0.0,
                                        "Negative": 0.0,
                                        "Neutral": 1.0,
                                        "Mixed": 0.0
                                    }
                                },
                                "BeginOffset": 0,
                                "EndOffset": 2
                            }
                        ]
                    },
                    {
                        "DescriptiveMentionIndex": [
                            0
                        ],
                        "Mentions": [
                            {
                                "Score": 0.9995260238647461,
                                "GroupScore": 1.0,
                                "Text": "meal",
                                "Type": "OTHER",
                                "MentionSentiment": {
                                    "Sentiment": "NEUTRAL",
                                    "SentimentScore": {
                                        "Positive": 0.04695599898695946,
                                        "Negative": 0.003226999891921878,
                                        "Neutral": 0.6091709733009338,
                                        "Mixed": 0.34064599871635437
                                    }
                                },
                                "BeginOffset": 3,
                                "EndOffset": 7
                            }
                        ]
                    }
                ]
            }
        ],
        "ErrorList": []
    }

For more information, see `Targeted Sentiment <https://docs.aws.amazon.com/comprehend/latest/dg/how-targeted-sentiment.html>`__ in the *Amazon Comprehend Developer Guide*.