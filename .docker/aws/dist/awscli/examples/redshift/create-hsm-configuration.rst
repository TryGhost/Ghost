**To create an HSM configuration**

The following ``create-hsm-configuration`` example creates the specified HSM configuration that contains information required by a cluster to store and use database encryption keys in a hardware security module (HSM). ::

    aws redshift create-hsm-configuration /
        --hsm-configuration-identifier myhsmconnection 
        --description "My HSM connection" 
        --hsm-ip-address 192.0.2.09 
        --hsm-partition-name myhsmpartition /
        --hsm-partition-password A1b2c3d4 /
        --hsm-server-public-certificate myhsmclientcert

Output::

    {
        "HsmConfiguration": {
            "HsmConfigurationIdentifier": "myhsmconnection",
            "Description": "My HSM connection",
            "HsmIpAddress": "192.0.2.09",
            "HsmPartitionName": "myhsmpartition",
            "Tags": []
        }
    }
