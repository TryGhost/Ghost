**To preview the instance types that match specified attributes**

The following ``get-instance-types-from-instance-requirements`` example first generates a list of all of the possible attributes that can be specified using the ``--generate-cli-skeleton`` parameter, and saves the list to a JSON file. Then, the JSON file is used to customize the attributes for which to preview matched instance types. 

To generate all possible attributes and save the output directly to a JSON file, use the following command. ::

    aws ec2 get-instance-types-from-instance-requirements \
        --region us-east-1 \
        --generate-cli-skeleton input > attributes.json

Output::

    {
        "DryRun": true,
        "ArchitectureTypes": [
            "x86_64_mac"
        ],
        "VirtualizationTypes": [
            "paravirtual"
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
                "intel"
            ],
            "MemoryGiBPerVCpu": {
                "Min": 0.0,
                "Max": 0.0
            },
            "ExcludedInstanceTypes": [
                ""
            ],
            "InstanceGenerations": [
                "current"
            ],
            "SpotMaxPricePercentageOverLowestPrice": 0,
            "OnDemandMaxPricePercentageOverLowestPrice": 0,
            "BareMetal": "included",
            "BurstablePerformance": "excluded",
            "RequireHibernateSupport": true,
            "NetworkInterfaceCount": {
                "Min": 0,
                "Max": 0
            },
            "LocalStorage": "required",
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
                "inference"
            ],
            "AcceleratorCount": {
                "Min": 0,
                "Max": 0
            },
            "AcceleratorManufacturers": [
                "xilinx"
            ],
            "AcceleratorNames": [
                "t4"
            ],
            "AcceleratorTotalMemoryMiB": {
                "Min": 0,
                "Max": 0
            }
        },
        "MaxResults": 0,
        "NextToken": ""
    }

Configure the JSON file. You must provide values for ``ArchitectureTypes``, ``VirtualizationTypes``, ``VCpuCount``, and ``MemoryMiB``. You can omit the other attributes. When omitted, default values are used. For a description of each attribute and their default values, see `get-instance-types-from-instance-requirements <https://docs.aws.amazon.com/cli/latest/reference/ec2/get-instance-types-from-instance-requirements.html>`.

Preview the instance types that have the attributes specified in ``attributes.json``. Specify the name and path to your JSON file by using the ``--cli-input-json`` parameter. In the following request, the output is formatted as a table. ::

    aws ec2 get-instance-types-from-instance-requirements \
        --cli-input-json file://attributes.json \
        --output table

Contents of ``attributes.json`` file::

    {
        
        "ArchitectureTypes": [
            "x86_64"
        ],
        "VirtualizationTypes": [
            "hvm"
        ],
        "InstanceRequirements": {
            "VCpuCount": {
                "Min": 4,
                "Max": 6
            },
            "MemoryMiB": {
                "Min": 2048
            },
            "InstanceGenerations": [
                "current"
            ]
        }
    }

Output::

    ------------------------------------------
    |GetInstanceTypesFromInstanceRequirements|
    +----------------------------------------+
    ||             InstanceTypes            ||
    |+--------------------------------------+|
    ||             InstanceType             ||
    |+--------------------------------------+|
    ||  c4.xlarge                           ||
    ||  c5.xlarge                           ||
    ||  c5a.xlarge                          ||
    ||  c5ad.xlarge                         ||
    ||  c5d.xlarge                          ||
    ||  c5n.xlarge                          ||
    ||  d2.xlarge                           ||
    ...

For more information about attribute-based instance type selection, see `How attribute-based instance type selection works <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-attribute-based-instance-type-selection.html#ec2fleet-abs-how-it-works>`__ in the *Amazon EC2 User Guide*.