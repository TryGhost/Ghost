**To create a signing profile**

The following ``put-signing-profile`` example creates a signing profile using the specified certificate and platform. ::

    aws signer put-signing-profile \
        --profile-name MyProfile6 \
        --signing-material certificateArn=arn:aws:acm:us-west-2:123456789012:certificate/6a55389b-306b-4e8c-a95c-0123456789abc \
        --platform AmazonFreeRTOS-TI-CC3220SF

Output::

    {
        "arn": "arn:aws:signer:us-west-2:123456789012:/signing-profiles/MyProfile6"
    }   
