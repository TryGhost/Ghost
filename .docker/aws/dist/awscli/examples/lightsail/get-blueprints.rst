**To get the blueprints for new instances**

The following ``get-blueprints`` example displays details about all of the available blueprints that can be used to create new instances in Amazon Lightsail. ::

    aws lightsail get-blueprints

Output::

    {
        "blueprints": [
            {
                "blueprintId": "wordpress",
                "name": "WordPress",
                "group": "wordpress",
                "type": "app",
                "description": "Bitnami, the leaders in application packaging, and Automattic, the experts behind WordPress, have teamed up to offer this official WordPress image. This image is a pre-configured, ready-to-run image for running WordPress on Amazon Lightsail. WordPress is the world's most popular content management platform. Whether it's for an enterprise or small business website, or a personal or corporate blog, content authors can easily create content using its new Gutenberg editor, and developers can extend the base platform with additional features. Popular plugins like Jetpack, Akismet, All in One SEO Pack, WP Mail, Google Analytics for WordPress, and Amazon Polly are all pre-installed in this image. Let's Encrypt SSL certificates are supported through an auto-configuration script.",
                "isActive": true,
                "minPower": 0,
                "version": "6.5.3-0",
                "versionCode": "1",
                "productUrl": "https://aws.amazon.com/marketplace/pp/B00NN8Y43U",
                "licenseUrl": "https://aws.amazon.com/marketplace/pp/B00NN8Y43U#pdp-usage",
                "platform": "LINUX_UNIX"
            },
            {
                "blueprintId": "lamp_8_bitnami",
                "name": "LAMP (PHP 8)",
                "group": "lamp_8",
                "type": "app",
                "description": "LAMP with PHP 8.X packaged by Bitnami enables you to quickly start building your websites and applications by providing a coding framework. As a developer, it provides standalone project directories to store your applications. This blueprint is configured for production environments. It includes SSL auto-configuration with Let's Encrypt certificates, and the latest releases of PHP, Apache, and MariaDB on Linux. This application also includes phpMyAdmin, PHP main modules and Composer.",
                "isActive": true,
                "minPower": 0,
                "version": "8.2.18-4",
                "versionCode": "1",
                "productUrl": "https://aws.amazon.com/marketplace/pp/prodview-6g3gzfcih6dvu",
                "licenseUrl": "https://aws.amazon.com/marketplace/pp/prodview-6g3gzfcih6dvu#pdp-usage",
                "platform": "LINUX_UNIX"
            },
            {
                "blueprintId": "nodejs",
                "name": "Node.js",
                "group": "node",
                "type": "app",
                "description": "Node.js packaged by Bitnami is a pre-configured, ready to run image for Node.js on Amazon EC2. It includes the latest version of Node.js, Apache, Python and Redis. The image supports multiple Node.js applications, each with its own virtual host and project directory. It is configured for production use and is secure by default, as all ports except HTTP, HTTPS and SSH ports are closed. Let's Encrypt SSL certificates are supported through an auto-configuration script. Developers benefit from instant access to a secure, update and consistent Node.js environment without having to manually install and configure multiple components and libraries.",
                "isActive": true,
                "minPower": 0,
                "version": "18.20.2-0",
                "versionCode": "1",
                "productUrl": "https://aws.amazon.com/marketplace/pp/B00NNZUAKO",
                "licenseUrl": "https://aws.amazon.com/marketplace/pp/B00NNZUAKO#pdp-usage",
                "platform": "LINUX_UNIX"
            },
            ...
            }
        ]
    }