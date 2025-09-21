**To promote a resource-policy based resource share to full functionality in AWS RAM**

The following ``promote-resource-share-created-from-policy`` example takes a resource share that you created implicitly by attaching a resource-based policy, and converts it to be fully functional with the AWS RAM console and its CLI and API operations. ::

    aws ram promote-resource-share-created-from-policy \
        --resource-share-arn arn:aws:ram:us-east-1:123456789012:resource-share/91fa8429-2d06-4032-909a-90909EXAMPLE

Output::

    {
        "returnValue": true
    }
