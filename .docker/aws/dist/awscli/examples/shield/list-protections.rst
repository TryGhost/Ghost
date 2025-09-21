**To retrieve protection summaries from AWS Shield Advanced**

The following ``list-protections`` example retrieves summaries of the protections that are enabled for the account. ::

    aws shield list-protections

Output::

    {
        "Protections": [
            {
                "Id": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "Name": "Protection for CloudFront distribution",
                "ResourceArn": "arn:aws:cloudfront::123456789012:distribution/E198WC25FXOWY8"
            }
        ]
    }
        
For more information, see `Specify Your Resources to Protect <https://docs.aws.amazon.com/waf/latest/developerguide/ddos-choose-resources.html>`__ in the *AWS Shield Advanced Developer Guide*.
