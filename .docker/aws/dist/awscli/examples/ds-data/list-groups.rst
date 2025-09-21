**To list a directory's groups**

The following ``list-groups`` example lists groups in the specified directory. ::

    aws ds-data list-groups \
        --directory-id d-1234567890 

Output::

    {
        "Groups": [
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Administrators",
                "SID": "S-1-2-33-441"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Users",
                "SID": "S-1-2-33-442"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Guests",
                "SID": "S-1-2-33-443"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Print Operators",
                "SID": "S-1-2-33-444"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Backup Operators",
                "SID": "S-1-2-33-445"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Replicator",
                "SID": "S-1-2-33-446"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Remote Desktop Users",
                "SID": "S-1-2-33-447"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Network Configuration Operators",
                "SID": "S-1-2-33-448"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Performance Monitor Users",
                "SID": "S-1-2-33-449"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Performance Log Users",
                "SID": "S-1-2-33-450"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Distributed COM Users",
                "SID": "S-1-2-33-451"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "IIS_IUSRS",
                "SID": "S-1-2-33-452"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Cryptographic Operators",
                "SID": "S-1-2-33-453"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Event Log Readers",
                "SID": "S-1-2-33-454"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Certificate Service DCOM Access",
                "SID": "S-1-2-33-456"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "RDS Remote Access Servers",
                "SID": "S-1-2-33-457"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "RDS Endpoint Servers",
                "SID": "S-1-2-33-458"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "RDS Management Servers",
                "SID": "S-1-2-33-459"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Hyper-V Administrators",
                "SID": "S-1-2-33-460"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Access Control Assistance Operators",
                "SID": "S-1-2-33-461"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Remote Management Users",
                "SID": "S-1-2-33-462"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Storage Replica Administrators",
                "SID": "S-1-2-33-463"
            },
            {
                "GroupScope": "Global",
                "GroupType": "Security",
                "SAMAccountName": "Domain Computers",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-789"
            },
            {
                "GroupScope": "Global",
                "GroupType": "Security",
                "SAMAccountName": "Domain Controllers",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-790"
            },
            {
                "GroupScope": "Universal",
                "GroupType": "Security",
                "SAMAccountName": "Schema Admins",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-791"
            },
            {
                "GroupScope": "Universal",
                "GroupType": "Security",
                "SAMAccountName": "Enterprise Admins",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-792"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "Cert Publishers",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-793"
            },
            {
                "GroupScope": "Global",
                "GroupType": "Security",
                "SAMAccountName": "Domain Admins",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-794"
            },
            {
                "GroupScope": "Global",
                "GroupType": "Security",
                "SAMAccountName": "Domain Users",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-795"
            },
            {
                "GroupScope": "Global",
                "GroupType": "Security",
                "SAMAccountName": "Domain Guests",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-796"
            },
            {
                "GroupScope": "Global",
                "GroupType": "Security",
                "SAMAccountName": "Group Policy Creator Owners",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-797"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "RAS and IAS Servers",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-798"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Server Operators",
                "SID": "S-1-2-33-464"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Account Operators",
                "SID": "S-1-2-33-465"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Pre-Windows 2000 Compatible Access",
                "SID": "S-1-2-33-466"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Incoming Forest Trust Builders",
                "SID": "S-1-2-33-467"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Windows Authorization Access Group",
                "SID": "S-1-2-33-468"
            },
            {
                "GroupScope": "BuiltinLocal",
                "GroupType": "Security",
                "SAMAccountName": "Terminal Server License Servers",
                "SID": "S-1-2-33-469"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "Allowed RODC Password Replication Group",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-798"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "Denied RODC Password Replication Group",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-799"
            },
            {
                "GroupScope": "Global",
                "GroupType": "Security",
                "SAMAccountName": "Read-only Domain Controllers",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-800"
            },
            {
                "GroupScope": "Universal",
                "GroupType": "Security",
                "SAMAccountName": "Enterprise Read-only Domain Controllers",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-801"
            },
            {
                "GroupScope": "Global",
                "GroupType": "Security",
                "SAMAccountName": "Cloneable Domain Controllers",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-802"
            },
            {
                "GroupScope": "Global",
                "GroupType": "Security",
                "SAMAccountName": "Protected Users",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-803"
            },
            {
                "GroupScope": "Global",
                "GroupType": "Security",
                "SAMAccountName": "Key Admins",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-804"
            },
            {
                "GroupScope": "Universal",
                "GroupType": "Security",
                "SAMAccountName": "Enterprise Key Admins",
                "SID": "S-1-2-34-56789123456-7891012345-6789123486-805"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "DnsAdmins",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4567"
            },
            {
                "GroupScope": "Global",
                "GroupType": "Security",
                "SAMAccountName": "DnsUpdateProxy",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4568"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "Admins",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4569"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWSAdministrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4570"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Object Management Service Accounts",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4571"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Private CA Connector for AD Delegated Group",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4572"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Application and Service Delegated Group",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4573"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4574"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated FSx Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4575"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Account Operators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4576"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Active Directory Based Activation Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4577"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Allowed to Authenticate Objects",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4578"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Allowed to Authenticate to Domain Controllers",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4579"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Deleted Object Lifetime Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4580"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Distributed File System Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4581"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Dynamic Host Configuration Protocol Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4582"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Enterprise Certificate Authority Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4583"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Fine Grained Password Policy Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4584"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Group Policy Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4585"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Managed Service Account Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4586"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Read Foreign Security Principals",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4587"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Remote Access Service Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4588"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Replicate Directory Changes Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4588"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Sites and Services Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4589"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated System Management Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4590"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Terminal Server Licensing Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4591"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated User Principal Name Suffix Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4592"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Add Workstations To Domain Users",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4593"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Domain Name System Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4594"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Kerberos Delegation Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4595"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated Server Administrators",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4596"
            },
            {
                "GroupScope": "DomainLocal",
                "GroupType": "Security",
                "SAMAccountName": "AWS Delegated MS-NPRC Non-Compliant Devices",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4597"
            },
            {
                "GroupScope": "Global",
                "GroupType": "Security",
                "SAMAccountName": "Remote Access",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4598"
            },
            {
                "GroupScope": "Global",
                "GroupType": "Security",
                "SAMAccountName": "Accounting",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4599"
            },
            {
                "GroupScope": "Global",
                "GroupType": "Distribution",
                "SAMAccountName": "sales",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4567"
            }
        ],
        "DirectoryId": "d-1234567890",
        "Realm": "corp.example.com"
    }

For more information, see `Viewing and updating an AWS Managed Microsoft AD group's details <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_view_update_group.html>`__ in the *AWS Directory Service Administration Guide*.
