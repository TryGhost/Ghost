**To list the current Snowball jobs in your account**

The following ``list-jobs`` example displays an array of ``JobListEntry`` objects. In this example, a single job is listed. ::

    aws snowball list-jobs

Output::

    {
        "JobListEntries": [ 
            { 
                "CreationDate": 2016-09-27T14:50Z,
                 "Description": "Important Photos 2016-08-11",
                 "IsMaster": TRUE,
                 "JobId": "ABCd1e324fe-022f-488e-a98b-3b0566063db1",
                 "JobState": "Complete",
                 "JobType": "IMPORT",
                 "SnowballType": "EDGE"
            }
       ]
    }

For more information, see `Jobs for AWS Snowball Edge devices <https://docs.aws.amazon.com/snowball/latest/developer-guide/jobs.html>`__ in the *AWS Snowball Developer Guide*.
