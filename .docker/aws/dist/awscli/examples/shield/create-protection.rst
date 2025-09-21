**To enable AWS Shield Advanced protection for a single AWS resource**

The following ``create-protection`` example enables Shield Advanced protection for the specified AWS CloudFront distribution. ::

    aws shield create-protection \
        --name "Protection for CloudFront distribution" \
        --resource-arn arn:aws:cloudfront::123456789012:distribution/E198WC25FXOWY8

Output::

    {
        "ProtectionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
    }

For more information, see `Specify Your Resources to Protect <https://docs.aws.amazon.com/waf/latest/developerguide/ddos-choose-resources.html>`__ in the *AWS Shield Advanced Developer Guide*.
