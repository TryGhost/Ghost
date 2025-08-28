const fs = require('fs').promises;
const path = require('path');
const config = require('../../../core/shared/config');

class CardAssetsFixtures {
    constructor() {
        this.srcPath = null;
        this.destPath = null;
        this.created = false;
    }

    async setup() {
        if (this.created) {
            return;
        }

        this.srcPath = path.join(config.get('paths').assetSrc, 'cards');
        this.destPath = path.join(config.get('paths').adminAssets, 'cards');

        // Create test card source files
        await fs.mkdir(path.join(this.srcPath, 'css'), {recursive: true});
        await fs.mkdir(path.join(this.srcPath, 'js'), {recursive: true});

        // Create test CSS files
        await fs.writeFile(
            path.join(this.srcPath, 'css', 'test-card1.css'),
            `
/* Test Card 1 CSS */
.test-card1 {
    background: #f0f0f0;
    border: 1px solid #ddd;
    padding: 10px;
    margin: 5px;
}

.test-card1 h2 {
    color: #333;
    font-size: 1.2em;
}

.test-card1 p {
    color: #666;
    line-height: 1.4;
}
            `.trim()
        );

        await fs.writeFile(
            path.join(this.srcPath, 'css', 'test-card2.css'),
            `
/* Test Card 2 CSS */
.test-card2 {
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    color: white;
    padding: 15px;
    border-radius: 8px;
}

.test-card2 .title {
    font-weight: bold;
    font-size: 1.1em;
}

.test-card2 .content {
    margin-top: 10px;
    opacity: 0.9;
}
            `.trim()
        );

        // Create test JS files
        await fs.writeFile(
            path.join(this.srcPath, 'js', 'test-card1.js'),
            `
// Test Card 1 JavaScript
(function() {
    'use strict';

    function initTestCard1() {
        console.log('Test Card 1 initialized');

        // Sample card functionality
        const cards = document.querySelectorAll('.test-card1');
        cards.forEach(card => {
            card.addEventListener('click', function() {
                this.style.transform = this.style.transform === 'scale(1.05)' ? 'scale(1)' : 'scale(1.05)';
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTestCard1);
    } else {
        initTestCard1();
    }
})();
            `.trim()
        );

        await fs.writeFile(
            path.join(this.srcPath, 'js', 'test-card2.js'),
            `
// Test Card 2 JavaScript
(function() {
    'use strict';

    function initTestCard2() {
        console.log('Test Card 2 initialized');

        // Sample interactive functionality
        const cards = document.querySelectorAll('.test-card2');
        cards.forEach(card => {
            const title = card.querySelector('.title');
            if (title) {
                title.addEventListener('mouseenter', function() {
                    this.style.textShadow = '2px 2px 4px rgba(0,0,0,0.3)';
                });

                title.addEventListener('mouseleave', function() {
                    this.style.textShadow = 'none';
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTestCard2);
    } else {
        initTestCard2();
    }
})();
            `.trim()
        );

        this.created = true;
    }

    async cleanup() {
        if (!this.created) {
            return;
        }

        try {
            // Clean up source files
            if (this.srcPath) {
                await fs.rmdir(this.srcPath, {recursive: true});
            }

            // Clean up destination files
            if (this.destPath) {
                await fs.rmdir(this.destPath, {recursive: true});
            }
        } catch (err) {
            // Ignore errors during cleanup
        }

        this.created = false;
        this.srcPath = null;
        this.destPath = null;
    }
}

module.exports = new CardAssetsFixtures();
