**To get information about the state of an instance**

The following ``get-instance-state`` example returns the state of the specified instance. ::

    aws lightsail get-instance-state \
        --instance-name MEAN-1

Output::

    {
        "state": {
            "code": 16,
            "name": "running"
        }
    }
