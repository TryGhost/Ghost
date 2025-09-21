**To list the things attached with a principal**

The following ``list-principal-things`` example lists the things attached to the principal specified by an ARN. ::

    aws iot list-principal-things \
        --principal arn:aws:iot:us-west-2:123456789012:cert/2e1eb273792174ec2b9bf4e9b37e6c6c692345499506002a35159767055278e8

Output::

    {
        "things": [
            "DeskLamp",
            "TableLamp"
        ]
    }

For more information, see `ListPrincipalThings <https://docs.aws.amazon.com/iot/latest/apireference/API_ListPrincipleThings.html>`__ in the *AWS IoT API Reference*.
