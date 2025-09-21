**To get firewall information for an instance**

The following ``get-instance-port-states`` example returns the firewall ports configured for instance ``MEAN-1``. ::

    aws lightsail get-instance-port-states \
        --instance-name MEAN-1

Output::

    {
        "portStates": [
            {
                "fromPort": 80,
                "toPort": 80,
                "protocol": "tcp",
                "state": "open"
            },
            {
                "fromPort": 22,
                "toPort": 22,
                "protocol": "tcp",
                "state": "open"
            },
            {
                "fromPort": 443,
                "toPort": 443,
                "protocol": "tcp",
                "state": "open"
            }
        ]
    }
