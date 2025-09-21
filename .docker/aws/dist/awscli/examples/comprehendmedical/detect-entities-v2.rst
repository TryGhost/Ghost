**Example 1: To detect entities directly from text**

The following ``detect-entities-v2`` example shows the detected entities and labels them according to type, directly from input text. ::

    aws comprehendmedical detect-entities-v2 \
        --text "Sleeping trouble on present dosage of Clonidine. Severe rash on face and leg, slightly itchy."

Output::

    {
        "Id": 0,
        "BeginOffset": 38,
        "EndOffset": 47,
        "Score": 0.9942955374717712,
        "Text": "Clonidine",
        "Category": "MEDICATION",
        "Type": "GENERIC_NAME",
        "Traits": []
    }

For more information, see `Detect Entities Version 2  <https://docs.aws.amazon.com/comprehend/latest/dg/extracted-med-info-V2.html>`__ in the *Amazon Comprehend Medical Developer Guide*.

**Example 2: To detect entities from a file path**

The following ``detect-entities-v2`` example shows the detected entities and labels them according to type from a file path. ::

    aws comprehendmedical detect-entities-v2 \
        --text file://medical_entities.txt

Contents of ``medical_entities.txt``::

    {
        "Sleeping trouble on present dosage of Clonidine. Severe rash on face and leg, slightly itchy."
    }

Output::

    {
        "Id": 0,
        "BeginOffset": 38,
        "EndOffset": 47,
        "Score": 0.9942955374717712,
        "Text": "Clonidine",
        "Category": "MEDICATION",
        "Type": "GENERIC_NAME",
        "Traits": []
    }

For more information, see `Detect Entities Version 2 <https://docs.aws.amazon.com/comprehend-medical/latest/dev/textanalysis-entitiesv2.html>`__ in the *Amazon Comprehend Medical Developer Guide*.