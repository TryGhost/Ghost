**To get active resource names**

The following ``get-active-names`` example returns the active resource names in the configured AWS Region. ::

    aws lightsail get-active-names

Output::

    {
        "activeNames": [
            "WordPress-1",
            "StaticIp-1",
            "MEAN-1",
            "Plesk_Hosting_Stack_on_Ubuntu-1"
        ]
    }
