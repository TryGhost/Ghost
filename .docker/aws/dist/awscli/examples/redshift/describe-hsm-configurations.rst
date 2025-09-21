**To describe HSM configurations**

The following ``describe-hsm-configurations`` example displays details for the available HSM configurations for the calling AWS account. ::

    aws redshift describe-hsm-configurations /
        --hsm-configuration-identifier myhsmconnection

Output::

    {
        "HsmConfigurations": [
            {
                "HsmConfigurationIdentifier": "myhsmconnection",
                "Description": "My HSM connection",
                "HsmIpAddress": "192.0.2.09",
                "HsmPartitionName": "myhsmpartition",
                "Tags": []
            }
        ]
    }
