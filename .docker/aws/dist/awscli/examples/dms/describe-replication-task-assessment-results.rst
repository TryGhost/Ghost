**To list the results of replication task assessmentss**

The following ``describe-replication-task-assessment-results`` example lists the results of a prior task assesssment. ::

    aws dms describe-replication-task-assessment-results

Output::

    {
        "ReplicationTaskAssessmentResults": [
            {
                "ReplicationTaskIdentifier": "moveit2",
                "ReplicationTaskArn": "arn:aws:dms:us-east-1:123456789012:task:K55IUCGBASJS5VHZJIINA45FII",
                "ReplicationTaskLastAssessmentDate": 1590790230.0,
                "AssessmentStatus": "No issues found",
                "AssessmentResultsFile": "moveit2/2020-05-29-22-10"
            }
        ]
    }


For more information, see `Creating a Task Assessment Report <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.AssessmentReport.html>`__ in the *AWS Database Migration Service User Guide*.
