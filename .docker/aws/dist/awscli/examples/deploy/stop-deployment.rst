**To attempt to stop a deployment**

The following ``stop-deployment`` example attempts to stop an in-progress deployment that is associated with the user's AWS account.

    aws deploy stop-deployment --deployment-id d-A1B2C3111

Output::

    {
        "status": "Succeeded", 
        "statusMessage": "No more commands will be scheduled for execution in the deployment instances"
    }
