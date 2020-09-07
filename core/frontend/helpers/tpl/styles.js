/* Default CSS Styles for helpers which are appended in theme via ghost_head */
const contentHelper = `.post-upgrade-cta-content,
.post-upgrade-cta {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    text-align: center;
    width: 100%;
    color: #ffffff;
    font-size: 16px;
}

.post-upgrade-cta-content {
    border-radius: 8px;
    padding: 40px 4vw;
}

.post-upgrade-cta h2 {
    color: #ffffff;
    font-size: 28px;
    letter-spacing: -0.2px;
    margin: 0;
    padding: 0;
}

.post-upgrade-cta p {
    margin: 20px 0 0;
    padding: 0;
}

.post-upgrade-cta small {
    font-size: 16px;
    letter-spacing: -0.2px;
}

.post-upgrade-cta a {
    color: #ffffff;
    cursor: pointer;
    font-weight: 500;
    box-shadow: none;
    text-decoration: underline;
}

.post-upgrade-cta a:hover {
    color: #ffffff;
    opacity: 0.8;
    box-shadow: none;
    text-decoration: underline;
}

.post-upgrade-cta a.button {
    display: block;
    background: #ffffff;
    text-decoration: none;
    margin: 28px 0 0;
    padding: 8px 18px;
    border-radius: 4px;
    font-size: 16px;
    font-weight: 600;
}

.post-upgrade-cta a.button:hover {
    opacity: 0.92;
}`;

const styles = contentHelper;

module.exports = styles;