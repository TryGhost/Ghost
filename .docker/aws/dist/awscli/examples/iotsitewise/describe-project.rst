**To describe a project**

The following ``describe-project`` example describes a wind farm project. ::

    aws iotsitewise describe-project \
        --project-id a1b2c3d4-5678-90ab-cdef-eeeeeEXAMPLE

Output::

    {
        "projectId": "a1b2c3d4-5678-90ab-cdef-eeeeeEXAMPLE",
        "projectArn": "arn:aws:iotsitewise:us-west-2:123456789012:project/a1b2c3d4-5678-90ab-cdef-eeeeeEXAMPLE",
        "projectName": "Wind Farm 1",
        "portalId": "a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE",
        "projectDescription": "Contains asset visualizations for Wind Farm #1 for Example Corp.",
        "projectCreationDate": "2020-02-20T21:58:43.362246001Z",
        "projectLastUpdateDate": "2020-02-20T21:58:43.362246095Z"
    }

For more information, see `Viewing project details <https://docs.aws.amazon.com/iot-sitewise/latest/appguide/view-project-details.html>`__ in the *AWS IoT SiteWise Monitor Application Guide*.