**To get your account-specific endpoint**

The following ``describe-endpoints`` example retrieves the endpoint that you need to send any other request to the service. ::

    aws mediaconvert describe-endpoints

Output::

    {
        "Endpoints": [
            {
                "Url": "https://abcd1234.mediaconvert.region-name-1.amazonaws.com"
            }
        ]
    }

For more information, see `Getting Started with MediaConvert Using the API <https://docs.aws.amazon.com/mediaconvert/latest/apireference/getting-started.html>`_ in the *AWS Elemental
MediaConvert API Reference*.
