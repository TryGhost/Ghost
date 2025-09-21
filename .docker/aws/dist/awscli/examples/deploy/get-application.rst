**To get information about an application**

The following ``get-application`` example displays information about an application that is associated with the user's AWS account. ::

    aws deploy get-application --application-name WordPress_App

Output::

    {
        "application": {
            "applicationName": "WordPress_App",
            "applicationId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
            "createTime": 1407878168.078,
            "linkedToGitHub": false
        }
    }
