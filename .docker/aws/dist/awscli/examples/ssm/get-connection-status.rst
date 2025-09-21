**To display the connection status of a managed instance**

This ``get-connection-status`` example returns the connection status of the specified managed instance. ::

    aws ssm get-connection-status \
        --target i-1234567890abcdef0

Output::

    {
        "Target": "i-1234567890abcdef0",
        "Status": "connected"
    }
