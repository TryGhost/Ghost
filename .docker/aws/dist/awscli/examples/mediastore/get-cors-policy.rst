**To view a CORS policy**

The following ``get-cors-policy`` example displays the cross-origin resource sharing (CORS) policy that is assigned to the specified container. ::

    aws mediastore get-cors-policy \
        --container-name ExampleContainer \
        --region us-west-2

Output::

    {
        "CorsPolicy": [
            {
                "AllowedMethods": [
                    "GET",
                    "HEAD"
                ],
                "MaxAgeSeconds": 3000,
                "AllowedOrigins": [
                    ""
                ],
                "AllowedHeaders": [
                    ""
                ]
            }
        ]
    }

For more information, see `Viewing a CORS Policy <https://docs.aws.amazon.com/mediastore/latest/ug/cors-policy-viewing.html>`__ in the *AWS Elemental MediaStore User Guide*.
