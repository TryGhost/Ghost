**To update your transfer location with a new agent**

The following ``update-location-object-storage`` example updates your DataSync location for Microsoft Azure Blob Storage with a new agent. ::

    aws datasync update-location-azure-blob \
        --location-arn arn:aws:datasync:us-west-2:123456789012:location/loc-abcdef01234567890 \
        --agent-arns arn:aws:datasync:us-west-2:123456789012:agent/agent-1234567890abcdef0 \
        --sas-configuration '{ \
            "Token": "sas-token-for-azure-blob-storage-access" \
        }'

This command produces no output.

For more information, see `Replacing your agent <https://docs.aws.amazon.com/datasync/latest/userguide/replacing-agent.html>`__ in the *AWS DataSync User Guide*.