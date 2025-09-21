**To list all signing platforms**

The following ``list-signing-platforms`` example displays details about all available signing platforms. ::

    aws signer list-signing-platforms

Output::

    {
        "platforms": [
            {
                "category": "AWS",
                "displayName": "AWS IoT Device Management SHA256-ECDSA ",
                "target": "SHA256-ECDSA",
                "platformId": "AWSIoTDeviceManagement-SHA256-ECDSA",
                "signingConfiguration": {
                    "encryptionAlgorithmOptions": {
                        "defaultValue": "ECDSA",
                        "allowedValues": [
                            "ECDSA"
                        ]
                    },
                    "hashAlgorithmOptions": {
                        "defaultValue": "SHA256",
                        "allowedValues": [
                            "SHA256"
                        ]
                    }
                },
                "maxSizeInMB": 2048,
                "partner": "AWSIoTDeviceManagement",
                "signingImageFormat": {
                    "defaultFormat": "JSONDetached",
                    "supportedFormats": [
                        "JSONDetached"
                    ]
                }
            },
            {
                "category": "AWS",
                "displayName": "Amazon FreeRTOS SHA1-RSA CC3220SF-Format",
                "target": "SHA1-RSA-TISHA1",
                "platformId": "AmazonFreeRTOS-TI-CC3220SF",
                "signingConfiguration": {
                    "encryptionAlgorithmOptions": {
                        "defaultValue": "RSA",
                        "allowedValues": [
                            "RSA"
                        ]
                    },
                    "hashAlgorithmOptions": {
                        "defaultValue": "SHA1",
                        "allowedValues": [
                            "SHA1"
                        ]
                    }
                },
                "maxSizeInMB": 16,
                "partner": "AmazonFreeRTOS",
                "signingImageFormat": {
                    "defaultFormat": "JSONEmbedded",
                    "supportedFormats": [
                        "JSONEmbedded"
                    ]
                }
            },
            {
                "category": "AWS",
                "displayName": "Amazon FreeRTOS SHA256-ECDSA",
                "target": "SHA256-ECDSA",
                "platformId": "AmazonFreeRTOS-Default",
                "signingConfiguration": {
                    "encryptionAlgorithmOptions": {
                        "defaultValue": "ECDSA",
                        "allowedValues": [
                            "ECDSA"
                        ]
                    },
                    "hashAlgorithmOptions": {
                        "defaultValue": "SHA256",
                        "allowedValues": [
                            "SHA256"
                        ]
                    }
                },
                "maxSizeInMB": 16,
                "partner": "AmazonFreeRTOS",
                "signingImageFormat": {
                    "defaultFormat": "JSONEmbedded",
                    "supportedFormats": [
                        "JSONEmbedded"
                    ]
                }
            }
        ]
    }
