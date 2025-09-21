**Example 1: To create a new filter in the current region**

The following ``create-filter`` example creates a filter that matches all Portscan findings for instance created from a specific image. This does not suppress those findings. ::

    aws guardduty create-filter \
        --detector-id b6b992d6d2f48e64bc59180bfexample \ 
        --name myFilterExample \
        --finding-criteria '{"Criterion": {"type": {"Eq": ["Recon:EC2/Portscan"]},"resource.instanceDetails.imageId": {"Eq": ["ami-0a7a207083example"]}}}'

Output::

    {
        "Name": "myFilterExample"
    }

For more information, see `Filtering GuardDuty findings <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_filter-findings.html>`__ in the *GuardDuty User Guide*.

**Example 2: To create a new filter and suppress findings in the current region**

The following ``create-filter`` example creates a filter that matches all Portscan findings for instance created from a specific image. This filter archives those findings so that they do not appear in your current findings. ::

    aws guardduty create-filter \
        --detector-id b6b992d6d2f48e64bc59180bfexample \ 
        --action ARCHIVE \
        --name myFilterSecondExample \
        --finding-criteria '{"Criterion": {"type": {"Eq": ["Recon:EC2/Portscan"]},"resource.instanceDetails.imageId": {"Eq": ["ami-0a7a207083example"]}}}'

Output::

    {
        "Name": "myFilterSecondExample"
    }

For more information, see `Filtering GuardDuty findings <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_filter-findings.html>`__ in the *GuardDuty User Guide*.
