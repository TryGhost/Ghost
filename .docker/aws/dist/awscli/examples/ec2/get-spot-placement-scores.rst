**To calculate the Spot placement score for specified requirements**

The following ``get-spot-placement-scores`` example first generates a list of all of the possible parameters that can be specified for the Spot placement score configuration using the ``--generate-cli-skeleton`` parameter, and saves the list to a JSON file. Then, the JSON file is used to configure the requirements to use to calculate the Spot placement score.

To generate all possible parameters that can be specified for the Spot placement score configuration, and save the output directly to a JSON file. ::

    aws ec2 get-spot-placement-scores \
        --region us-east-1 \
        --generate-cli-skeleton input > attributes.json

Output::

    {
        "InstanceTypes": [
            ""
        ],
        "TargetCapacity": 0,
        "TargetCapacityUnitType": "vcpu",
        "SingleAvailabilityZone": true,
        "RegionNames": [
            ""
        ],
        "InstanceRequirementsWithMetadata": {
            "ArchitectureTypes": [
                "x86_64_mac"
            ],
            "VirtualizationTypes": [
                "hvm"
            ],
            "InstanceRequirements": {
                "VCpuCount": {
                    "Min": 0,
                    "Max": 0
                },
                "MemoryMiB": {
                    "Min": 0,
                    "Max": 0
                },
                "CpuManufacturers": [
                    "amd"
                ],
                "MemoryGiBPerVCpu": {
                    "Min": 0.0,
                    "Max": 0.0
                },
                "ExcludedInstanceTypes": [
                    ""
                ],
                "InstanceGenerations": [
                    "previous"
                ],
                "SpotMaxPricePercentageOverLowestPrice": 0,
                "OnDemandMaxPricePercentageOverLowestPrice": 0,
                "BareMetal": "excluded",
                "BurstablePerformance": "excluded",
                "RequireHibernateSupport": true,
                "NetworkInterfaceCount": {
                    "Min": 0,
                    "Max": 0
                },
                "LocalStorage": "included",
                "LocalStorageTypes": [
                    "hdd"
                ],
                "TotalLocalStorageGB": {
                    "Min": 0.0,
                    "Max": 0.0
                },
                "BaselineEbsBandwidthMbps": {
                    "Min": 0,
                    "Max": 0
                },
                "AcceleratorTypes": [
                    "fpga"
                ],
                "AcceleratorCount": {
                    "Min": 0,
                    "Max": 0
                },
                "AcceleratorManufacturers": [
                    "amd"
                ],
                "AcceleratorNames": [
                    "vu9p"
                ],
                "AcceleratorTotalMemoryMiB": {
                    "Min": 0,
                    "Max": 0
                }
            }
        },
        "DryRun": true,
        "MaxResults": 0,
        "NextToken": ""
    }

Configure the JSON file. You must provide a value for ``TargetCapacity``. For a description of each parameter and their default values, see `Calculate the Spot placement score (AWS CLI) <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-placement-score.html#calculate-sps-cli>`.

Calculate the Spot placement score for the requirements specified in ``attributes.json``. Specify the name and path to your JSON file by using the ``--cli-input-json`` parameter. ::

    aws ec2 get-spot-placement-scores \
        --region us-east-1 \
        --cli-input-json file://attributes.json

Output if ``SingleAvailabilityZone`` is set to ``false`` or omitted (if omitted, it defaults to ``false``). A scored list of Regions is returned. ::

    "Recommendation": [
        {
            "Region": "us-east-1",
            "Score": 7
        },
        {
            "Region": "us-west-1",
            "Score": 5
        },  
       ...

Output if ``SingleAvailabilityZone`` is set to ``true``. A scored list of SingleAvailability Zones is returned. ::

    "Recommendation": [
        {
            "Region": "us-east-1",
            "AvailabilityZoneId": "use1-az1"
            "Score": 8
        },
        {
            "Region": "us-east-1",
            "AvailabilityZoneId": "usw2-az3"
            "Score": 6
        },
       ...

For more information about calculating a Spot placement score, and for example configurations, see `Calculate a Spot placement score <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-placement-score.html#work-with-spot-placement-score>`__ in the *Amazon EC2 User Guide*.