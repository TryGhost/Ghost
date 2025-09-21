**To delete a deployment group**

The following ``delete-deployment-group`` example deletes a deployment group that is associated with the specified application. ::

    aws deploy delete-deployment-group \
        --application-name WordPress_App \
        --deployment-group-name WordPress_DG

Output::

    {
        "hooksNotCleanedUp": []
    }
