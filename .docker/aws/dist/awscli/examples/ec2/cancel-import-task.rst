**To cancel an import task**

The following ``cancel-import-task`` example cancels the specified import image task. ::

    aws ec2 cancel-import-task \
        --import-task-id import-ami-1234567890abcdef0

Output::

    {
        "ImportTaskId": "import-ami-1234567890abcdef0",
        "PreviousState": "active",
        "State": "deleting"
    }
