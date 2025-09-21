**To get the information about an IoT Device Advisor qualifying test suite run report**

The following ``get-suite-run-report`` example gets the report download link for a successful device advisor qualifying test suite run with the specified suite definition ID and suite run ID. ::

    aws iotdeviceadvisor get-suite-run-report \
        --suite-definition-id ztvb5aek4w4x \
        --suite-run-id p6awv83nre6v

Output::

    {
        "qualificationReportDownloadUrl": "https://senate-apn-reports-us-east-1-prod.s3.amazonaws.com/report.downloadlink"
    }

For more information, see `Get a qualification report for a successful qualification test suite run <https://docs.aws.amazon.com/iot/latest/developerguide/device-advisor-workflow.html#device-advisor-workflow-qualification-report>`__ in the *AWS IoT Core Developer Guide*.
