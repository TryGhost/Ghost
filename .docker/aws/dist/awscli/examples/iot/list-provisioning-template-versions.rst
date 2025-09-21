**To list provisioning template versions**

The following ``list-provisioning-template-versions`` example lists the available versions of the specified provisioning template. :: 

    aws iot list-provisioning-template-versions \
        --template-name "widget-template" 

Output::

    {
        "versions": [
            {
                "versionId": 1,
                "creationDate": 1574800471.339,
                "isDefaultVersion": true
            },
            {
                "versionId": 2,
                "creationDate": 1574801192.317,
                "isDefaultVersion": false
            }
        ]
    }

For more information, see `AWS IoT Secure Tunneling <https://docs.aws.amazon.com/iot/latest/developerguide/secure-tunneling.html>`__ in the *AWS IoT Core Developer Guide*.
