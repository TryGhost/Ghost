**To detect the dominant language of multiple input texts**

The following ``batch-detect-dominant-language`` example analyzes multiple input texts and returns the dominant language of each. 
The pre-trained models confidence score is also output for each prediction. ::

    aws comprehend batch-detect-dominant-language \
        --text-list "Physics is the natural science that involves the study of matter and its motion and behavior through space and time, along with related concepts such as energy and force."

Output::

    {
        "ResultList": [
            {
                "Index": 0,
                "Languages": [
                    {
                        "LanguageCode": "en",
                        "Score": 0.9986501932144165
                    }
                ]
            }
        ],
        "ErrorList": []
    }

For more information, see `Dominant Language <https://docs.aws.amazon.com/comprehend/latest/dg/how-languages.html>`__ in the *Amazon Comprehend Developer Guide*.