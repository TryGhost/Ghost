(async function () {
    const countsMap = {};
    const fetchingIds = new Set();

    const api = document.querySelector('[data-ghost-comments-counts-api]')
        .dataset.ghostCommentsCountsApi;

    const debounce = function (func, timeout = 100) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), timeout);
        };
    };

    const addIdsFromElement = function (node) {
        const countElems = node.querySelectorAll?.('[data-ghost-comment-count]') || [];

        countElems.forEach((countElem) => {
            if (!countsMap[countElem.dataset.ghostCommentCount]) {
                fetchingIds.add(countElem.dataset.ghostCommentCount);
            }
        });
    };

    const renderCounts = function () {
        for (const [id, count] of Object.entries(countsMap)) {
            const countElems = document.querySelectorAll(`[data-ghost-comment-count="${id}"]`);
            countElems.forEach((e) => {
                let text = e.dataset.ghostCommentCountEmpty;
                if (count === 1) {
                    if (e.dataset.ghostCommentCountSingular) {
                        text = `${count} ${e.dataset.ghostCommentCountSingular}`;
                    } else {
                        text = count;
                    }
                }
                if (count > 1) {
                    if (e.dataset.ghostCommentCountPlural) {
                        text = `${count} ${e.dataset.ghostCommentCountPlural}`;
                    } else {
                        text = count;
                    }
                }
                if (text) {
                    if (e.dataset.ghostCommentCountAutowrap !== 'false') {
                        const el = document.createElement(e.dataset.ghostCommentCountTag);
                        if (e.dataset.ghostCommentCountClassName) {
                            el.classList.add(e.dataset.ghostCommentCountClassName);
                        }
                        el.textContent = text;
                        e.insertAdjacentElement('afterend', el);
                    } else {
                        e.insertAdjacentText('afterend', text);
                    }
                }
                e.remove();
            });
        }
    };

    const fetchCounts = async function () {
        const ids = Array.from(fetchingIds);
        fetchingIds.clear();

        if (!ids.length) {
            return;
        }

        const rawRes = await fetch(`${api}?ids=${ids.join(',')}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (rawRes.status !== 200) {
            return;
        }

        const res = await rawRes.json();

        for (const [id, count] of Object.entries(res)) {
            countsMap[id] = count;
        }

        renderCounts();
    };

    const countElemObserver = new MutationObserver((mutationsList) => {
        mutationsList.forEach((mutation) => {
            mutation.addedNodes.forEach((addedNode) => {
                addIdsFromElement(addedNode);
                debounce(fetchCounts);
            });
        });
    });

    countElemObserver.observe(document.body, {subtree: true, childList: true});

    addIdsFromElement(document.body);
    fetchCounts();
})();
