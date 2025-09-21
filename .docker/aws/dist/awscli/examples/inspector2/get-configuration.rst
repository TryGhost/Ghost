**To get the setting configuration for Inspector scans**

The following ``get-configuration`` example gets the setting configuration for Inspector scans. ::

    aws inspector2 get-configuration

Output::

    {
        "ec2Configuration": {
            "scanModeState": {
                "scanMode": "EC2_HYBRID",
                "scanModeStatus": "SUCCESS"
            }
        },
        "ecrConfiguration": {
            "rescanDurationState": {
                "pullDateRescanDuration": "DAYS_90",
                "rescanDuration": "DAYS_30",
                "status": "SUCCESS",
                "updatedAt": "2024-05-14T21:16:20.237000+00:00"
            }
         }
    }

For more information, see `Automated resource scanning with Amazon Inspector <https://docs.aws.amazon.com/inspector/latest/user/scanning-resources.html>`__ in the *Amazon Inspector User Guide*.