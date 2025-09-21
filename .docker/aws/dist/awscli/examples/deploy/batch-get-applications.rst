**To get information about multiple applications**

The following ``batch-get-applications`` example displays information about multiple applications that are associated with the user's AWS account. ::

    aws deploy batch-get-applications --application-names WordPress_App MyOther_App

Output::

    {
        "applicationsInfo": [
            {
                "applicationName": "WordPress_App",
                "applicationId": "d9dd6993-f171-44fa-a811-211e4EXAMPLE",
                "createTime": 1407878168.078,
                "linkedToGitHub": false
            },
            {
                "applicationName": "MyOther_App",
                "applicationId": "8ca57519-31da-42b2-9194-8bb16EXAMPLE",
                "createTime": 1407453571.63,
                "linkedToGitHub": false
            }
        ]
    }
