**To detect the parts of speech in an input text**

The following ``detect-syntax`` example analyzes the syntax of the input text and returns the different parts of speech.
The pre-trained model's confidence score is also output for each prediction. ::

    aws comprehend detect-syntax \
        --language-code en \
        --text "It is a beautiful day in Seattle."

Output::

    {
        "SyntaxTokens": [
            {
                "TokenId": 1,
                "Text": "It",
                "BeginOffset": 0,
                "EndOffset": 2,
                "PartOfSpeech": {
                    "Tag": "PRON",
                    "Score": 0.9999740719795227
                }
            },
            {
                "TokenId": 2,
                "Text": "is",
                "BeginOffset": 3,
                "EndOffset": 5,
                "PartOfSpeech": {
                    "Tag": "VERB",
                    "Score": 0.999901294708252
                }
            },
            {
                "TokenId": 3,
                "Text": "a",
                "BeginOffset": 6,
                "EndOffset": 7,
                "PartOfSpeech": {
                    "Tag": "DET",
                    "Score": 0.9999938607215881
                }
            },
            {
                "TokenId": 4,
                "Text": "beautiful",
                "BeginOffset": 8,
                "EndOffset": 17,
                "PartOfSpeech": {
                    "Tag": "ADJ",
                    "Score": 0.9987351894378662
                }
            },
            {
                "TokenId": 5,
                "Text": "day",
                "BeginOffset": 18,
                "EndOffset": 21,
                "PartOfSpeech": {
                    "Tag": "NOUN",
                    "Score": 0.9999796748161316
                }
            },
            {
                "TokenId": 6,
                "Text": "in",
                "BeginOffset": 22,
                "EndOffset": 24,
                "PartOfSpeech": {
                    "Tag": "ADP",
                    "Score": 0.9998047947883606
                }
            },
            {
                "TokenId": 7,
                "Text": "Seattle",
                "BeginOffset": 25,
                "EndOffset": 32,
                "PartOfSpeech": {
                    "Tag": "PROPN",
                    "Score": 0.9940530061721802
                }
            }
        ]
    }

For more information, see `Syntax Analysis <https://docs.aws.amazon.com/comprehend/latest/dg/how-syntax.html>`__ in the *Amazon Comprehend Developer Guide*.