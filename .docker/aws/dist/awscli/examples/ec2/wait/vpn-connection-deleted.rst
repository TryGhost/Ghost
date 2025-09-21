**To wait until a VPN connection is deleted**

The following ``wait vpn-connection-deleted`` example command pauses and continues when it can confirm that the specified VPN connection is deleted. It produces no output. ::

    aws ec2 wait vpn-connection-deleted \
        --vpn-connection-ids vpn-1234567890abcdef0
