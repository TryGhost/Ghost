**To detect the sentiment of an input text**

The following ``detect-sentiment`` example analyzes the input text and returns an inference of the prevailing sentiment (``POSITIVE``, ``NEUTRAL``, ``MIXED``, or ``NEGATIVE``). ::

    aws comprehend detect-sentiment \
        --language-code en \
        --text "It is a beautiful day in Seattle"

Output::

    {
        "Sentiment": "POSITIVE",
        "SentimentScore": {
            "Positive": 0.9976957440376282,
            "Negative": 9.653854067437351e-05,
            "Neutral": 0.002169104292988777,
            "Mixed": 3.857641786453314e-05
        }
    }


For more information, see `Sentiment <https://docs.aws.amazon.com/comprehend/latest/dg/how-sentiment.html>`__ in the *Amazon Comprehend Developer Guide*
