**To enable termination protection**

The following ``update-termination-protection`` example enables termination protection on the specified stack. ::

    aws cloudformation update-termination-protection \
        --stack-name my-stack \
        --enable-termination-protection

Output::

    {
        "StackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack/d0a825a0-e4cd-xmpl-b9fb-061c69e99204"
    }
