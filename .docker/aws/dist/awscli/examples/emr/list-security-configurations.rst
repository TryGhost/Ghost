**To list security configurations in the current region**
 
Command::
 
    aws emr list-security-configurations

Output::

    {
        "SecurityConfigurations": [
            {
                "CreationDateTime": 1473889697.417,
                "Name": "MySecurityConfig-1"
            },
            {
                "CreationDateTime": 1473889697.417,
                "Name": "MySecurityConfig-2"
            }
        ]
    }
    