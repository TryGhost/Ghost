**To detect the dominant language of input text**

The following ``detect-dominant-language`` analyzes the input text and identifies the dominant language. The pre-trained model's confidence score is also output. ::

    aws comprehend detect-dominant-language \
        --text "It is a beautiful day in Seattle."

Output:: 

    {
        "Languages": [
            {
                "LanguageCode": "en",
                "Score": 0.9877256155014038
            }
        ]
    }

For more information, see `Dominant Language <https://docs.aws.amazon.com/comprehend/latest/dg/how-languages.html>`__ in the *Amazon Comprehend Developer Guide*.
