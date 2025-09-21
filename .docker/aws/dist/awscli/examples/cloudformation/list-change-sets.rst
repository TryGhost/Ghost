**To list change sets**

The following ``list-change-sets`` example displays a list of the pending change sets for the specified stack. ::

	aws cloudformation list-change-sets \
	   --stack-name my-stack

Output::

    {
        "Summaries": [
            {
                "StackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack/d0a825a0-e4cd-xmpl-b9fb-061c69e99204",
                "StackName": "my-stack",
                "ChangeSetId": "arn:aws:cloudformation:us-west-2:123456789012:changeSet/my-change-set/70160340-7914-xmpl-bcbf-128a1fa78b5d",
                "ChangeSetName": "my-change-set",
                "ExecutionStatus": "AVAILABLE",
                "Status": "CREATE_COMPLETE",
                "CreationTime": "2019-10-02T05:38:54.297Z"
            }
        ]
    }
