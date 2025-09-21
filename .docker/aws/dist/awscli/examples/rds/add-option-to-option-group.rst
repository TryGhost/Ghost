**To add an option to an option group**

The following ``add-option-to-option-group`` example adds an option to the specified option group. :: 

    aws rds add-option-to-option-group \
        --option-group-name myoptiongroup \
        --options OptionName=OEM,Port=5500,DBSecurityGroupMemberships=default \
        --apply-immediately

Output::

    {
        "OptionGroup": {
            "OptionGroupName": "myoptiongroup",
            "OptionGroupDescription": "Test Option Group",
            "EngineName": "oracle-ee",
            "MajorEngineVersion": "12.1",
            "Options": [
                {
                    "OptionName": "Timezone",
                    "OptionDescription": "Change time zone",
                    "Persistent": true,
                    "Permanent": false,
                    "OptionSettings": [
                        {
                            "Name": "TIME_ZONE",
                            "Value": "Australia/Sydney",
                            "DefaultValue": "UTC",
                            "Description": "Specifies the timezone the user wants to change the system time to",
                            "ApplyType": "DYNAMIC",
                            "DataType": "STRING",
                            "AllowedValues": "Africa/Cairo,Africa/Casablanca,Africa/Harare,Africa/Lagos,Africa/Luanda,Africa/Monrovia,Africa/Nairobi,Africa/Tripoli,Africa/Windhoek,America/Araguaina,America/Argentina/Buenos_Aires,America/Asuncion,America/Bogota,America/Caracas,America/Chicago,America/Chihuahua,America/Cuiaba,America/Denver,America/Detroit,America/Fortaleza,America/Godthab,America/Guatemala,America/Halifax,America/Lima,America/Los_Angeles,America/Manaus,America/Matamoros,America/Mexico_City,America/Monterrey,America/Montevideo,America/New_York,America/Phoenix,America/Santiago,America/Sao_Paulo,America/Tijuana,America/Toronto,Asia/Amman,Asia/Ashgabat,Asia/Baghdad,Asia/Baku,Asia/Bangkok,Asia/Beirut,Asia/Calcutta,Asia/Damascus,Asia/Dhaka,Asia/Hong_Kong,Asia/Irkutsk,Asia/Jakarta,Asia/Jerusalem,Asia/Kabul,Asia/Karachi,Asia/Kathmandu,Asia/Kolkata,Asia/Krasnoyarsk,Asia/Magadan,Asia/Manila,Asia/Muscat,Asia/Novosibirsk,Asia/Rangoon,Asia/Riyadh,Asia/Seoul,Asia/Shanghai,Asia/Singapore,Asia/Taipei,Asia/Tehran,Asia/Tokyo,Asia/Ulaanbaatar,Asia/Vladivostok,Asia/Yakutsk,Asia/Yerevan,Atlantic/Azores,Atlantic/Cape_Verde,Australia/Adelaide,Australia/Brisbane,Australia/Darwin,Australia/Eucla,Australia/Hobart,Australia/Lord_Howe,Australia/Perth,Australia/Sydney,Brazil/DeNoronha,Brazil/East,Canada/Newfoundland,Canada/Saskatchewan,Etc/GMT-3,Europe/Amsterdam,Europe/Athens,Europe/Berlin,Europe/Dublin,Europe/Helsinki,Europe/Kaliningrad,Europe/London,Europe/Madrid,Europe/Moscow,Europe/Paris,Europe/Prague,Europe/Rome,Europe/Sarajevo,Pacific/Apia,Pacific/Auckland,Pacific/Chatham,Pacific/Fiji,Pacific/Guam,Pacific/Honolulu,Pacific/Kiritimati,Pacific/Marquesas,Pacific/Samoa,Pacific/Tongatapu,Pacific/Wake,US/Alaska,US/Central,US/East-Indiana,US/Eastern,US/Pacific,UTC",
                            "IsModifiable": true,
                            "IsCollection": false
                        }
                    ],
                    "DBSecurityGroupMemberships": [],
                    "VpcSecurityGroupMemberships": []
                },
                {
                    "OptionName": "OEM",
                    "OptionDescription": "Oracle 12c EM Express",
                    "Persistent": false,
                    "Permanent": false,
                    "Port": 5500,
                    "OptionSettings": [],
                    "DBSecurityGroupMemberships": [
                        {
                            "DBSecurityGroupName": "default",
                            "Status": "authorized"
                        }
                    ],
                    "VpcSecurityGroupMemberships": []
                }
            ],
            "AllowsVpcAndNonVpcInstanceMemberships": false,
            "OptionGroupArn": "arn:aws:rds:us-east-1:123456789012:og:myoptiongroup"
        }
    }

For more information, see `Adding an Option to an Option Group <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithOptionGroups.html#USER_WorkingWithOptionGroups.AddOption>`__ in the *Amazon RDS User Guide*.
