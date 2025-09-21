**Example 1: To list the certificates registered in your AWS account**

The following ``list-certificates`` example lists all certificates registered in your account. If you have more than the default paging limit of 25, you can use the ``nextMarker`` response value from this command and supply it to the next command to get the next batch of results. Repeat until ``nextMarker`` returns without a value.  ::

    aws iot list-certificates

Output::

    {
        "certificates": [
            {
                "certificateArn": "arn:aws:iot:us-west-2:123456789012:cert/604c48437a57b7d5fc5d137c5be75011c6ee67c9a6943683a1acb4b1626bac36",
                "certificateId": "604c48437a57b7d5fc5d137c5be75011c6ee67c9a6943683a1acb4b1626bac36",
                "status": "ACTIVE",
                "creationDate": 1556810537.617
            },
            {
                "certificateArn": "arn:aws:iot:us-west-2:123456789012:cert/262a1ac8a7d8aa72f6e96e365480f7313aa9db74b8339ec65d34dc3074e1c31e",
                "certificateId": "262a1ac8a7d8aa72f6e96e365480f7313aa9db74b8339ec65d34dc3074e1c31e",
                "status": "ACTIVE",
                "creationDate": 1546447050.885
            },
            {
                "certificateArn": "arn:aws:iot:us-west-2:123456789012:cert/b193ab7162c0fadca83246d24fa090300a1236fe58137e121b011804d8ac1d6b",
                "certificateId": "b193ab7162c0fadca83246d24fa090300a1236fe58137e121b011804d8ac1d6b",
                "status": "ACTIVE",
                "creationDate": 1546292258.322
            },
            {
                "certificateArn": "arn:aws:iot:us-west-2:123456789012:cert/7aebeea3845d14a44ec80b06b8b78a89f3f8a706974b8b34d18f5adf0741db42",
                "certificateId": "7aebeea3845d14a44ec80b06b8b78a89f3f8a706974b8b34d18f5adf0741db42",
                "status": "ACTIVE",
                "creationDate": 1541457693.453
            },
            {
                "certificateArn": "arn:aws:iot:us-west-2:123456789012:cert/54458aa39ebb3eb39c91ffbbdcc3a6ca1c7c094d1644b889f735a6fc2cd9a7e3",
                "certificateId": "54458aa39ebb3eb39c91ffbbdcc3a6ca1c7c094d1644b889f735a6fc2cd9a7e3",
                "status": "ACTIVE",
                "creationDate": 1541113568.611
            },
            {
                "certificateArn": "arn:aws:iot:us-west-2:123456789012:cert/4f0ba725787aa94d67d2fca420eca022242532e8b3c58e7465c7778b443fd65e",
                "certificateId": "4f0ba725787aa94d67d2fca420eca022242532e8b3c58e7465c7778b443fd65e",
                "status": "ACTIVE",
                "creationDate": 1541022751.983
            }
        ]
    }

