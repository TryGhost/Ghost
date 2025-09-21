**To detect the prevailing sentiment of multiple input texts**

The following ``batch-detect-sentiment`` example analyzes multiple input texts and returns the prevailing sentiment (``POSITIVE``, ``NEUTRAL``, ``MIXED``, or ``NEGATIVE``, of each one). ::

    aws comprehend batch-detect-sentiment \
        --text-list "That movie was very boring, I can't believe it was over four hours long." "It is a beautiful day for hiking today." "My meal was okay, I'm excited to try other restaurants." \
        --language-code en

Output:: 

    {
        "ResultList": [
            {
                "Index": 0,
                "Sentiment": "NEGATIVE",
                "SentimentScore": {
                    "Positive": 0.00011316669406369328,
                    "Negative": 0.9995445609092712,
                    "Neutral": 0.00014722718333359808,
                    "Mixed": 0.00019498742767609656
                }
            },
            {
                "Index": 1,
                "Sentiment": "POSITIVE",
                "SentimentScore": {
                    "Positive": 0.9981263279914856,
                    "Negative": 0.00015240783977787942,
                    "Neutral": 0.0013876151060685515,
                    "Mixed": 0.00033366199932061136
                }
            },
            {
                "Index": 2,
                "Sentiment": "MIXED",
                "SentimentScore": {
                    "Positive": 0.15930435061454773,
                    "Negative": 0.11471917480230331,
                    "Neutral": 0.26897063851356506,
                    "Mixed": 0.45700588822364807
                }
            }
        ],
        "ErrorList": []
    }

For more information, see `Sentiment <https://docs.aws.amazon.com/comprehend/latest/dg/how-sentiment.html>`__ in the *Amazon Comprehend Developer Guide*.
