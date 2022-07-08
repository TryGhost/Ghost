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
                e.innerHTML = e.innerHTML.replace('#', count);
                e.style.display = '';
            });
        }
    };

    const fetchCounts = async function () {
        const ids = Array.from(fetchingIds);
        fetchingIds.clear();

        const rawRes = await fetch(api, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ids})
        });

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
