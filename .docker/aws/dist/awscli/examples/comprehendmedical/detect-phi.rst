**Example 1: To detect protected health information (PHI) directly from text**

The following ``detect-phi`` example displays the detected protected health information (PHI) entities directly from input text. ::

    aws comprehendmedical detect-phi \
        --text "Patient Carlos Salazar presented with rash on his upper extremities and dry cough. He lives at 100 Main Street, Anytown, USA where he works from his home as a carpenter."

Output::

    {
        "Entities": [
            {
                "Id": 0,
                "BeginOffset": 8,
                "EndOffset": 21,
                "Score": 0.9914507269859314,
                "Text": "Carlos Salazar",
                "Category": "PROTECTED_HEALTH_INFORMATION",
                "Type": "NAME",
                "Traits": []
            },
            {
                "Id": 1,
                "BeginOffset": 94,
                "EndOffset": 109,
                "Score": 0.871849775314331,
                "Text": "100 Main Street, Anytown, USA",
                "Category": "PROTECTED_HEALTH_INFORMATION",
                "Type": "ADDRESS",
                "Traits": []
            },
            {
                "Id": 2,
                "BeginOffset": 145,
                "EndOffset": 154,
                "Score": 0.8302185535430908,
                "Text": "carpenter",
                "Category": "PROTECTED_HEALTH_INFORMATION",
                "Type": "PROFESSION",
                "Traits": []
            }
        ],
        "ModelVersion": "0.0.0"
    }

For more information, see `Detect PHI <https://docs.aws.amazon.com/comprehend-medical/latest/dev/textanalysis-phi.html>`__ in the *Amazon Comprehend Medical Developer Guide*.

**Example 2: To detect protect health information (PHI) directly from a file path**

The following ``detect-phi`` example shows the detected protected health information (PHI) entities from a file path. ::

    aws comprehendmedical detect-phi \
        --text file://phi.txt

Contents of ``phi.txt``::

    "Patient Carlos Salazar presented with a rash on his upper extremities and a dry cough. He lives at 100 Main Street, Anytown, USA, where he works from his home as a carpenter."

Output::

    {
        "Entities": [
            {
                "Id": 0,
                "BeginOffset": 8,
                "EndOffset": 21,
                "Score": 0.9914507269859314,
                "Text": "Carlos Salazar",
                "Category": "PROTECTED_HEALTH_INFORMATION",
                "Type": "NAME",
                "Traits": []
            },
            {
                "Id": 1,
                "BeginOffset": 94,
                "EndOffset": 109,
                "Score": 0.871849775314331,
                "Text": "100 Main Street, Anytown, USA",
                "Category": "PROTECTED_HEALTH_INFORMATION",
                "Type": "ADDRESS",
                "Traits": []
            },
            {
                "Id": 2,
                "BeginOffset": 145,
                "EndOffset": 154,
                "Score": 0.8302185535430908,
                "Text": "carpenter",
                "Category": "PROTECTED_HEALTH_INFORMATION",
                "Type": "PROFESSION",
                "Traits": []
            }
        ],
        "ModelVersion": "0.0.0"
    }

For more information, see `Detect PHI <https://docs.aws.amazon.com/comprehend/latest/dg/how-medical-phi.html>`__ in the *Amazon Comprehend Medical Developer Guide*.