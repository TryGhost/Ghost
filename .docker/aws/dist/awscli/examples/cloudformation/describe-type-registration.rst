**To display type registration information**

The following ``describe-type-registration`` example displays information about the specified type registration, including the type's current status, type, and version. ::

    aws cloudformation describe-type-registration \
        --registration-token a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

   {
       "ProgressStatus": "COMPLETE",
       "TypeArn": "arn:aws:cloudformation:us-west-2:123456789012:type/resource/My-Logs-LogGroup",
       "Description": "Deployment is currently in DEPLOY_STAGE of status COMPLETED; ",
       "TypeVersionArn": "arn:aws:cloudformation:us-west-2:123456789012:type/resource/My-Logs-LogGroup/00000001"
   }

For more information, see `Using the CloudFormation Registry <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/registry.html>`__ in the *AWS CloudFormation Users Guide*.
