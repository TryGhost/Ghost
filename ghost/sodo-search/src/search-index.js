import elasticlunr from 'elasticlunr';

let index;

export const init = async function ({apiUrl, apiKey}) {
    // remove default stop words to search of *any* word
    elasticlunr.clearStopWords();

    const url = `${apiUrl}/posts/?key=${apiKey}&limit=all&fields=id,title,excerpt,url,updated_at,visibility&order=updated_at%20desc&formats=plaintext`;

    const indexDump = JSON.parse(localStorage.getItem('ease_search_index'));

    localStorage.removeItem('ease_index');
    localStorage.removeItem('ease_last');

    function update(data) {
        data.posts.forEach(function (post) {
            index.addDoc(post);
        });

        localStorage.setItem('ease_search_index', JSON.stringify(index));
        localStorage.setItem('ease_search_last', data.posts[0].updated_at);
    }

    if (
        !indexDump
    ) {
        return fetch(url)
            .then(response => response.json())
            .then((data) => {
                if (data.posts.length > 0) {
                    index = elasticlunr(function () {
                        this.addField('title');
                        this.addField('plaintext');
                        this.setRef('id');
                    });

                    update(data);
                }
            });
    } else {
        index = elasticlunr.Index.load(indexDump);

        return fetch(`${url}&filter=updated_at:>'${localStorage.getItem('ease_search_last').replace(/\..*/, '').replace(/T/, ' ')}'`
        )
            .then(response => response.json())
            .then((data) => {
                if (data.posts.length > 0) {
                    update(data);
                }
            });
    }
};

export const search = function (value) {
    return index.search(value, {expand: true});
};
