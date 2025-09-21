**To wait until a VPN connection is available**

The following ``vpn-connection-available`` example pauses and resumes running only after it confirms that the specified VPN connection is available. It produces no output. ::

    aws ec2 wait vpn-connection-available \
        --vpn-connection-ids vpn-1234567890abcdef0
