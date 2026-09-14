const Papa = require('papaparse');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const models = require('../../models');

const messages = {
    formNotFound: 'Form not found.',
    formNotActive: 'This form is currently not accepting submissions.',
    fieldRequired: 'Field "{field}" is required.'
};

class FormsService {
    /**
     * Export all submissions for a given form as CSV
     * @param {string} formId
     * @returns {Promise<string>}
     */
    async exportSubmissionsCSV(formId) {
        const form = await models.Form.findOne({id: formId});
        if (!form) {
            throw new errors.NotFoundError({
                message: tpl(messages.formNotFound)
            });
        }

        let schema = form.get('schema');
        if (typeof schema === 'string') {
            try {
                schema = JSON.parse(schema);
            } catch (e) {
                schema = {};
            }
        }

        const fields = (schema && Array.isArray(schema.fields)) ? schema.fields : [];
        const submissions = await models.FormSubmission.findAll({
            filter: `form_id:${formId}`,
            order: 'created_at desc'
        });

        const headers = ['Submission ID', 'Submitted At', ...fields.map(f => f.label || f.name || f.id)];

        const rows = submissions.map((sub) => {
            let data = sub.get('data');
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    data = {};
                }
            } else if (!data) {
                data = {};
            }

            const row = [
                sub.get('id'),
                sub.get('created_at') ? new Date(sub.get('created_at')).toISOString() : ''
            ];

            for (const field of fields) {
                const val = data[field.id] !== undefined ? data[field.id] : data[field.name];
                if (val === undefined || val === null) {
                    row.push('');
                } else if (Array.isArray(val)) {
                    row.push(val.join(', '));
                } else if (typeof val === 'boolean') {
                    row.push(val ? 'Yes' : 'No');
                } else {
                    row.push(String(val));
                }
            }

            return row;
        });

        return Papa.unparse({
            fields: headers,
            data: rows
        });
    }

    /**
     * Validate and submit data for a form
     * @param {string} formId
     * @param {Object} rawData
     * @param {Object} [options]
     * @returns {Promise<Object>}
     */
    async submitForm(formId, rawData, options = {}) {
        const form = await models.Form.findOne({id: formId});
        if (!form) {
            throw new errors.NotFoundError({
                message: tpl(messages.formNotFound)
            });
        }

        if (form.get('status') !== 'active') {
            throw new errors.BadRequestError({
                message: tpl(messages.formNotActive)
            });
        }

        let schema = form.get('schema');
        if (typeof schema === 'string') {
            try {
                schema = JSON.parse(schema);
            } catch (e) {
                schema = {};
            }
        }

        const fields = (schema && Array.isArray(schema.fields)) ? schema.fields : [];
        const data = (typeof rawData === 'string' ? JSON.parse(rawData) : rawData) || {};

        for (const field of fields) {
            if (field.required) {
                const val = data[field.id] !== undefined ? data[field.id] : data[field.name];
                if (val === undefined || val === null || val === '' || (field.type === 'checkbox' && val === false)) {
                    throw new errors.ValidationError({
                        message: tpl(messages.fieldRequired, {
                            field: field.label || field.name || field.id
                        })
                    });
                }
            }
        }

        const submission = await models.FormSubmission.add({
            form_id: form.id,
            data: typeof data === 'string' ? data : JSON.stringify(data)
        }, options);

        return submission;
    }

    async getPublicForm(data, options = {}) {
        const form = await models.Form.findOne(data, options);
        if (!form || form.get('status') !== 'active') {
            throw new errors.NotFoundError({
                message: tpl(messages.formNotFound)
            });
        }

        return {
            id: form.get('id'),
            name: form.get('name'),
            description: form.get('description'),
            schema: form.get('schema')
        };
    }

    async submitPublicForm(frame) {
        const rawData = (frame.data && frame.data.submissions && frame.data.submissions[0])
            || (frame.data && frame.data.submission)
            || (frame.data && frame.data.forms && frame.data.forms[0])
            || frame.data;

        return this.submitForm(frame.options.id, rawData, frame.options);
    }

    async generateEmbedScript(formId) {
        const form = await models.Form.findOne({id: formId});
        if (!form || form.get('status') !== 'active') {
            // Form is deleted or archived: automatically remove the form from any post/page DOM!
            return `(function() {
  try {
    var els = document.querySelectorAll('[data-ghost-form="${formId}"], #ghost-form-container-${formId}');
    els.forEach(function(el) { el.remove(); });
  } catch (e) {}
})();`;
        }

        let schema = form.get('schema');
        if (typeof schema === 'string') {
            try {
                schema = JSON.parse(schema);
            } catch (e) {
                schema = {fields: []};
            }
        }
        const fields = (schema && Array.isArray(schema.fields)) ? schema.fields : [];
        const customCss = (schema && schema.custom_css) || form.get('custom_css') || '';
        const name = form.get('name') || 'Form';
        const description = form.get('description') || '';

        return `(function() {
  var formId = ${JSON.stringify(formId)};
  var name = ${JSON.stringify(name)};
  var description = ${JSON.stringify(description)};
  var fields = ${JSON.stringify(fields)};
  var customCss = ${JSON.stringify(customCss)};

  function init() {
    var target = document.querySelector('[data-ghost-form="' + formId + '"]') || document.getElementById('ghost-form-container-' + formId);
    if (!target) {
      target = document.createElement('div');
      target.setAttribute('data-ghost-form', formId);
      var currentScript = document.currentScript;
      if (currentScript && currentScript.parentNode) {
        currentScript.parentNode.insertBefore(target, currentScript);
      } else {
        document.body.appendChild(target);
      }
    }

    var styleHtml = customCss ? '<style>' + customCss + '</style>' : '';
    
    var fieldsHtml = fields.map(function(f) {
      var reqAttr = f.required ? ' required' : '';
      var reqStar = f.required ? ' <span style="color: #e53e3e;">*</span>' : '';
      
      if (f.type === 'textarea') {
        return '<div class="ghost-form-group" style="margin-bottom: 1rem;">' +
          '<label class="ghost-form-label" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">' + f.label + reqStar + '</label>' +
          '<textarea class="ghost-form-input" name="' + (f.name || f.id) + '" placeholder="' + (f.placeholder || '') + '" rows="4"' + reqAttr + ' style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-family: inherit; font-size: 0.875rem; box-sizing: border-box;"></textarea>' +
        '</div>';
      }
      
      if (f.type === 'checkbox') {
        return '<div class="ghost-form-group ghost-form-checkbox-group" style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">' +
          '<input type="checkbox" class="ghost-form-checkbox" name="' + (f.name || f.id) + '" id="ghost-field-' + f.id + '"' + reqAttr + ' style="border-radius: 0.25rem;">' +
          '<label class="ghost-form-label" for="ghost-field-' + f.id + '" style="font-size: 0.875rem; font-weight: 500;">' + f.label + reqStar + '</label>' +
        '</div>';
      }
      
      if (f.type === 'select') {
        var opts = (f.options || []).map(function(opt) {
          return '<option value="' + opt + '">' + opt + '</option>';
        }).join('');
        return '<div class="ghost-form-group" style="margin-bottom: 1rem;">' +
          '<label class="ghost-form-label" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">' + f.label + reqStar + '</label>' +
          '<select class="ghost-form-input" name="' + (f.name || f.id) + '"' + reqAttr + ' style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-family: inherit; font-size: 0.875rem; box-sizing: border-box;">' +
            '<option value="">' + (f.placeholder || 'Select an option') + '</option>' + opts +
          '</select>' +
        '</div>';
      }
      
      return '<div class="ghost-form-group" style="margin-bottom: 1rem;">' +
        '<label class="ghost-form-label" style="display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem;">' + f.label + reqStar + '</label>' +
        '<input class="ghost-form-input" type="' + f.type + '" name="' + (f.name || f.id) + '" placeholder="' + (f.placeholder || '') + '"' + reqAttr + ' style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-family: inherit; font-size: 0.875rem; box-sizing: border-box;">' +
      '</div>';
    }).join('');

    var formHtml = styleHtml +
      '<div id="ghost-form-container-' + formId + '" class="ghost-form-container" style="max-width: 580px; margin: 2rem auto; padding: 1.75rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; background: #ffffff; color: #1e293b; font-family: system-ui, -apple-system, sans-serif;">' +
        '<h3 class="ghost-form-title" style="margin-top: 0; margin-bottom: 0.5rem; font-size: 1.25rem; font-weight: 700;">' + name + '</h3>' +
        (description ? '<p class="ghost-form-description" style="margin-top: 0; margin-bottom: 1.25rem; color: #64748b; font-size: 0.875rem;">' + description + '</p>' : '') +
        '<form id="ghost-form-' + formId + '" class="ghost-form">' +
          fieldsHtml +
          '<button type="submit" id="ghost-form-btn-' + formId + '" class="ghost-form-btn" style="width: 100%; padding: 0.625rem 1rem; background: #111827; color: #ffffff; border: none; border-radius: 0.375rem; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: opacity 0.2s;">Submit</button>' +
          '<div id="ghost-form-msg-' + formId + '" class="ghost-form-msg" style="margin-top: 0.75rem; font-size: 0.875rem; display: none;"></div>' +
        '</form>' +
      '</div>';

    target.innerHTML = formHtml;

    var formEl = document.getElementById('ghost-form-' + formId);
    var btnEl = document.getElementById('ghost-form-btn-' + formId);
    var msgEl = document.getElementById('ghost-form-msg-' + formId);

    if (formEl) {
      formEl.addEventListener('submit', function(e) {
        e.preventDefault();
        var formData = new FormData(formEl);
        var data = {};
        formData.forEach(function(val, key) { data[key] = val; });

        btnEl.disabled = true;
        btnEl.style.opacity = '0.6';
        btnEl.innerText = 'Submitting...';
        msgEl.style.display = 'none';

        fetch('/ghost/api/content/forms/' + formId + '/submissions', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(data)
        })
        .then(function(res) {
          return res.json().then(function(body) {
            if (!res.ok) throw new Error((body.errors && body.errors[0] && body.errors[0].message) || 'Submission failed');
            return body;
          });
        })
        .then(function() {
          formEl.reset();
          msgEl.style.display = 'block';
          msgEl.style.color = '#16a34a';
          msgEl.innerText = 'Thank you! Your response has been recorded.';
        })
        .catch(function(err) {
          msgEl.style.display = 'block';
          msgEl.style.color = '#dc2626';
          msgEl.innerText = err.message || 'Something went wrong. Please try again.';
        })
        .finally(function() {
          btnEl.disabled = false;
          btnEl.style.opacity = '1';
          btnEl.innerText = 'Submit';
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`;
    }

    /**
     * Get posts and pages where this form is attached or embedded
     * @param {string} formId
     * @returns {Promise<Array>}
     */
    async getFormAttachedPosts(formId) {
        if (!formId) {
            return [];
        }
        try {
            const knex = models.Base.knex;
            const rows = await knex('posts')
                .select('id', 'title', 'slug', 'type', 'status', 'updated_at')
                .where(function () {
                    this.where('lexical', 'like', `%${formId}%`)
                        .orWhere('mobiledoc', 'like', `%${formId}%`)
                        .orWhere('html', 'like', `%${formId}%`);
                });
            return rows || [];
        } catch (err) {
            return [];
        }
    }

    /**
     * Attach a form to a post or page content
     * @param {string} formId
     * @param {string|Object} target - Post ID string or payload object
     * @param {string} [placementOption='end'] - 'start' or 'end'
     * @returns {Promise<Object>}
     */
    async attachFormToPost(formId, target, placementOption = 'end') {
        let postId = target;
        let placement = placementOption;
        if (target && typeof target === 'object') {
            postId = target.post_id || (target.forms && target.forms[0] && target.forms[0].post_id);
            placement = target.placement || (target.forms && target.forms[0] && target.forms[0].placement) || 'end';
        }

        const knex = models.Base.knex;
        const post = await knex('posts').where({id: postId}).first();
        if (!post) {
            throw new errors.NotFoundError({
                message: 'Post or page not found.'
            });
        }

        const embedSnippet = `<div data-ghost-form="${formId}"></div><script src="/ghost/api/content/forms/${formId}/embed.js" async></script>`;

        let lexical = post.lexical;
        let mobiledoc = post.mobiledoc;

        if (lexical) {
            try {
                const lexObj = JSON.parse(lexical);
                if (lexObj && lexObj.root && Array.isArray(lexObj.root.children)) {
                    // Remove any existing form card for this formId first
                    lexObj.root.children = lexObj.root.children.filter((child) => {
                        return !(child.type === 'html' && typeof child.html === 'string' && child.html.includes(formId));
                    });

                    const newChild = {
                        type: 'html',
                        version: 1,
                        html: embedSnippet
                    };

                    if (placement === 'start') {
                        lexObj.root.children.unshift(newChild);
                    } else {
                        lexObj.root.children.push(newChild);
                    }
                    lexical = JSON.stringify(lexObj);
                }
            } catch (e) {
                // Ignore parse errors
            }
        } else if (mobiledoc) {
            try {
                const docObj = JSON.parse(mobiledoc);
                if (docObj && Array.isArray(docObj.cards)) {
                    const cardIndex = docObj.cards.length;
                    docObj.cards.push(['html', {html: embedSnippet}]);
                    if (Array.isArray(docObj.sections)) {
                        if (placement === 'start') {
                            docObj.sections.unshift([10, cardIndex]);
                        } else {
                            docObj.sections.push([10, cardIndex]);
                        }
                    }
                    mobiledoc = JSON.stringify(docObj);
                }
            } catch (e) {
                // Ignore parse errors
            }
        } else {
            lexical = JSON.stringify({
                root: {
                    children: [{
                        type: 'html',
                        version: 1,
                        html: embedSnippet
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });
        }

        await knex('posts').where({id: postId}).update({
            lexical,
            mobiledoc,
            updated_at: new Date()
        });

        return {
            post_id: postId,
            form_id: formId,
            attached: true
        };
    }

    /**
     * Detach a form from a post or page
     * @param {string} formId
     * @param {string|Object} target - Post ID string or payload object
     * @returns {Promise<Object>}
     */
    async detachFormFromPost(formId, target) {
        let postId = target;
        if (target && typeof target === 'object') {
            postId = target.post_id || (target.forms && target.forms[0] && target.forms[0].post_id);
        }

        const knex = models.Base.knex;
        const post = await knex('posts').where({id: postId}).first();
        if (!post) {
            throw new errors.NotFoundError({
                message: 'Post or page not found.'
            });
        }

        let lexical = post.lexical;
        let mobiledoc = post.mobiledoc;
        let html = post.html;

        if (lexical) {
            try {
                const lexObj = JSON.parse(lexical);
                if (lexObj && lexObj.root && Array.isArray(lexObj.root.children)) {
                    lexObj.root.children = lexObj.root.children.filter((child) => {
                        return !(child.type === 'html' && typeof child.html === 'string' && child.html.includes(formId));
                    });
                    lexical = JSON.stringify(lexObj);
                }
            } catch (e) {
                // Ignore parse error
            }
        }

        if (mobiledoc) {
            try {
                const docObj = JSON.parse(mobiledoc);
                if (docObj && Array.isArray(docObj.cards)) {
                    const remainingCards = [];
                    const cardIndexMap = {};
                    docObj.cards.forEach((card, idx) => {
                        const isTarget = card[0] === 'html' && JSON.stringify(card[1]).includes(formId);
                        if (!isTarget) {
                            cardIndexMap[idx] = remainingCards.length;
                            remainingCards.push(card);
                        }
                    });
                    docObj.cards = remainingCards;
                    if (Array.isArray(docObj.sections)) {
                        docObj.sections = docObj.sections
                            .filter(sec => !(sec[0] === 10 && cardIndexMap[sec[1]] === undefined))
                            .map((sec) => {
                                if (sec[0] === 10) {
                                    return [10, cardIndexMap[sec[1]]];
                                }
                                return sec;
                            });
                    }
                    mobiledoc = JSON.stringify(docObj);
                }
            } catch (e) {
                // Ignore parse error
            }
        }

        if (html && typeof html === 'string') {
            const regex = new RegExp(`(<div[^>]*data-ghost-form=["']${formId}["'][^>]*>(?:<\\/div>)?(?:\\s*<script[^>]*forms\\/${formId}\\/embed\\.js[^>]*><\\/script>)?|<div[^>]*id=["']ghost-form-container-${formId}["'][\\s\\S]*?<\\/div>(?:\\s*<script[\\s\\S]*?<\\/script>)?|<script[^>]*forms\\/${formId}\\/embed\\.js[^>]*><\\/script>)`, 'gi');
            html = html.replace(regex, '');
        }

        await knex('posts').where({id: postId}).update({
            lexical,
            mobiledoc,
            html,
            updated_at: new Date()
        });

        return {
            post_id: postId,
            form_id: formId,
            detached: true
        };
    }

    /**
     * Completely clean up all references to a form across all posts and pages in the database.
     * Invoked automatically whenever a form is deleted or archived.
     * @param {string} formId
     * @returns {Promise<number>} Number of posts cleaned up
     */
    async cleanupFormFromPostsAndPages(formId) {
        if (!formId) {
            return 0;
        }
        try {
            const knex = models.Base.knex;
            const affectedPosts = await knex('posts')
                .where(function () {
                    this.where('lexical', 'like', `%${formId}%`)
                        .orWhere('mobiledoc', 'like', `%${formId}%`)
                        .orWhere('html', 'like', `%${formId}%`);
                });

            for (const post of affectedPosts) {
                let lexical = post.lexical;
                let mobiledoc = post.mobiledoc;
                let html = post.html;

                if (lexical) {
                    try {
                        const lexObj = JSON.parse(lexical);
                        if (lexObj && lexObj.root && Array.isArray(lexObj.root.children)) {
                            lexObj.root.children = lexObj.root.children.filter((child) => {
                                return !(child.type === 'html' && typeof child.html === 'string' && child.html.includes(formId));
                            });
                            lexical = JSON.stringify(lexObj);
                        }
                    } catch (e) {
                        // Ignore parse error
                    }
                }

                if (mobiledoc) {
                    try {
                        const docObj = JSON.parse(mobiledoc);
                        if (docObj && Array.isArray(docObj.cards)) {
                            const remainingCards = [];
                            const cardIndexMap = {};
                            docObj.cards.forEach((card, idx) => {
                                const isTarget = card[0] === 'html' && JSON.stringify(card[1]).includes(formId);
                                if (!isTarget) {
                                    cardIndexMap[idx] = remainingCards.length;
                                    remainingCards.push(card);
                                }
                            });
                            docObj.cards = remainingCards;
                            if (Array.isArray(docObj.sections)) {
                                docObj.sections = docObj.sections
                                    .filter(sec => !(sec[0] === 10 && cardIndexMap[sec[1]] === undefined))
                                    .map((sec) => {
                                        if (sec[0] === 10) {
                                            return [10, cardIndexMap[sec[1]]];
                                        }
                                        return sec;
                                    });
                            }
                            mobiledoc = JSON.stringify(docObj);
                        }
                    } catch (e) {
                        // Ignore parse error
                    }
                }

                if (html && typeof html === 'string') {
                    const regex = new RegExp(`(<div[^>]*data-ghost-form=["']${formId}["'][^>]*>(?:<\\/div>)?(?:\\s*<script[^>]*forms\\/${formId}\\/embed\\.js[^>]*><\\/script>)?|<div[^>]*id=["']ghost-form-container-${formId}["'][\\s\\S]*?<\\/div>(?:\\s*<script[\\s\\S]*?<\\/script>)?|<script[^>]*forms\\/${formId}\\/embed\\.js[^>]*><\\/script>)`, 'gi');
                    html = html.replace(regex, '');
                }

                await knex('posts').where({id: post.id}).update({
                    lexical,
                    mobiledoc,
                    html,
                    updated_at: new Date()
                });
            }

            return affectedPosts.length;
        } catch (err) {
            return 0;
        }
    }
}

module.exports = new FormsService();
