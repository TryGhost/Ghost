**To detect the targeted sentiment of named entities in an input text**

The following ``detect-targeted-sentiment`` example analyzes the input text and returns the named entities in addition to the targeted sentiment associated with each entity. 
The pre-trained models confidence score for each prediction is also output. ::

    aws comprehend detect-targeted-sentiment \
        --language-code en \
        --text "I do not enjoy January because it is too cold but August is the perfect temperature"

Output:: 

    {
        "Entities": [
            {
                "DescriptiveMentionIndex": [
                    0
                ],
                "Mentions": [
                    {
                        "Score": 0.9999979734420776,
                        "GroupScore": 1.0,
                        "Text": "I",
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
                        "EndOffset": 1
                    }
                ]
            },
            {
                "DescriptiveMentionIndex": [
                    0
                ],
                "Mentions": [
                    {
                        "Score": 0.9638869762420654,
                        "GroupScore": 1.0,
                        "Text": "January",
                        "Type": "DATE",
                        "MentionSentiment": {
                            "Sentiment": "NEGATIVE",
                            "SentimentScore": {
                                "Positive": 0.0031610000878572464,
                                "Negative": 0.9967250227928162,
                                "Neutral": 0.00011100000119768083,
                                "Mixed": 1.9999999949504854e-06
                            }
                        },
                        "BeginOffset": 15,
                        "EndOffset": 22
                    }
                ]
            },
            {
                "DescriptiveMentionIndex": [
                    0
                ],
                "Mentions": [
                    {
                    {
                        "Score": 0.9664419889450073,
                        "GroupScore": 1.0,
                        "Text": "August",
                        "Type": "DATE",
                        "MentionSentiment": {
                            "Sentiment": "POSITIVE",
                            "SentimentScore": {
                                "Positive": 0.9999549984931946,
                                "Negative": 3.999999989900971e-06,
                                "Neutral": 4.099999932805076e-05,
                                "Mixed": 0.0
                            }
                        },
                        "BeginOffset": 50,
                        "EndOffset": 56
                    }
                ]
            },
            {
                "DescriptiveMentionIndex": [
                    0
                ],
                "Mentions": [
                    {
                        "Score": 0.9803199768066406,
                        "GroupScore": 1.0,
                        "Text": "temperature",
                        "Type": "ATTRIBUTE",
                        "MentionSentiment": {
                            "Sentiment": "POSITIVE",
                            "SentimentScore": {
                                "Positive": 1.0,
                                "Negative": 0.0,
                                "Neutral": 0.0,
                                "Mixed": 0.0
                            }
                        },
                        "BeginOffset": 77,
                        "EndOffset": 88
                    }
                ]
            }
        ]
    }

For more information, see `Targeted Sentiment <https://docs.aws.amazon.com/comprehend/latest/dg/how-targeted-sentiment.html>`__ in the *Amazon Comprehend Developer Guide*.