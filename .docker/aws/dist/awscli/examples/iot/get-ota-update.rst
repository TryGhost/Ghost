**To retrieve information about an OTA Update**

The following ``get-ota-update`` example displays details about the specified OTA Update. ::

    aws iot get-ota-update \
        --ota-update-id ota12345

Output::

    {
        "otaUpdateInfo": {
            "otaUpdateId": "ota12345",
            "otaUpdateArn": "arn:aws:iot:us-west-2:123456789012:otaupdate/itsaupdate",
            "creationDate": 1557863215.995,
            "lastModifiedDate": 1557863215.995,
            "description": "A critical update needed right away.",  
            "targets": [
               "device1",
               "device2",
               "device3",
               "device4"
            ],
            "targetSelection": "SNAPSHOT",
            "protocols": ["HTTP"],
            "awsJobExecutionsRolloutConfig": {
               "maximumPerMinute": 10
            },
            "otaUpdateFiles": [
                {
                    "fileName": "firmware.bin",                
                    "fileLocation": {
                        "stream": {
                            "streamId": "004",                         
                            "fileId":123
                        }                        
                    },
                    "codeSigning": {
                        "awsSignerJobId": "48c67f3c-63bb-4f92-a98a-4ee0fbc2bef6"     
                    }
                }
            ],
            "roleArn": "arn:aws:iam:123456789012:role/service-role/my_ota_role"
            "otaUpdateStatus": "CREATE_COMPLETE",
            "awsIotJobId": "job54321",
            "awsIotJobArn": "arn:aws:iot:us-west-2:123456789012:job/job54321",
            "errorInfo": {
            }
        }
    }

For more information, see `GetOTAUpdate <https://docs.aws.amazon.com/iot/latest/apireference/API_GetOTAUpdate.html>`__ in the *AWS IoT API Reference*.
