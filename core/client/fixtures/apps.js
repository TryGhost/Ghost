var apps = [
    {
        'id': 1,
        'name': 'testApp',
        'package': {
            'name': 'testApp',
            'version': '2.0.1',
            'description': 'An example application showing how to filter jquery from ghost foot',
            'author': 'Ghost Foundation',
            'homepage': 'http://ghost.org',
            'repository': {
                'type': 'git',
                'url': 'git://github.com/TryGhost/Example-Apps'
            },
            'licenses': [
                {
                    'type': 'MIT',
                    'url': 'https://raw.github.com/TryGhost/Example-Apps/master/LICENSE'
                }
            ],
            'main': 'index.js',
            'engines': {
                'node': '0.10.*'
            },
            'engineStrict': true,
            'dependencies': {
                'ghost-app': '~0.0.2',
                'lodash': '~2.4.1'
            },
            'devDependencies': {}
        },
        'active': true
    },
    {
        'id': 2,
        'name': 'testApp2',
        'package': {
            'name': 'testApp2',
            'version': '0.1.1',
            'description': 'An example application showing how to filter jquery from ghost foot',
            'author': 'Ghost Foundation',
            'homepage': 'http://ghost.org',
            'repository': {
                'type': 'git',
                'url': 'git://github.com/TryGhost/Example-Apps'
            },
            'licenses': [
                {
                    'type': 'MIT',
                    'url': 'https://raw.github.com/TryGhost/Example-Apps/master/LICENSE'
                }
            ],
            'main': 'index.js',
            'engines': {
                'node': '0.10.*'
            },
            'engineStrict': true,
            'dependencies': {
                'ghost-app': '~0.0.2',
                'lodash': '~2.4.1'
            },
            'devDependencies': {}
        },
        'active': false
    },
];

export default apps;