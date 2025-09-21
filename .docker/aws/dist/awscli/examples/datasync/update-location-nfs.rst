**To update your transfer location with a new agent**

The following ``update-location-nfs`` example updates your DataSync NFS location with a new agent. ::

    aws datasync update-location-nfs \
        --location-arn arn:aws:datasync:us-west-2:123456789012:location/loc-abcdef01234567890 \
        --on-prem-config AgentArns=arn:aws:datasync:us-west-2:123456789012:agent/agent-1234567890abcdef0

This command produces no output.

For more information, see `Replacing your agent <https://docs.aws.amazon.com/datasync/latest/userguide/replacing-agent.html>`__ in the *AWS DataSync User Guide*.