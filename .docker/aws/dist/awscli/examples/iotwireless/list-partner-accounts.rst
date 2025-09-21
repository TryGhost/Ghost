**To list the partner accounts**

The following ``list-partner-accounts`` example lists the available partner accounts associated with your AWS account. ::

    aws iotwireless list-partner-accounts

Output::

    {
        "Sidewalk": [
            {
                "AmazonId": "78965678771228", 
                "Fingerprint": "bd96d8ef66dbfd2160eb60e156849e82ad7018b8b73c1ba0b4fc65c32498ee35"
            }, 
            {
                "AmazonId": "89656787651228", 
                "Fingerprint": "bc5e99e151c07be14be7e6603e4489c53f858b271213a36ebe3370777ba06e9b"
            }
        ]
    }

For more information, see `Amazon Sidewalk Integration for AWS IoT Core <https://docs.aws.amazon.com/iot/latest/developerguide/iot-sidewalk.html>`__ in the *AWS IoT Developers Guide*.
