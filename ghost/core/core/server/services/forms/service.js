const Papa = require('papaparse');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const models = require('../../models');

const messages = {
    formNotFound: 'Form not found.',
    formNotActive: 'This form is currently not accepting submissions.',
    fieldRequired: 'Field "{field}" is required.'
};

function escapeHtml(str) {
    if (str === null || str === undefined) {
        return '';
    }
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeCustomCss(css) {
    if (!css || typeof css !== 'string') {
        return '';
    }
    return css
        .replace(/<\/style/gi, '<\\/style')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '');
}

function escapeRegExp(str) {
    if (!str) {
        return '';
    }
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isValidFormId(id) {
    return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id);
}

function getCelebrationSvg() {
    return '<svg width="140" height="140" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">' +
        '<circle cx="100" cy="100" r="92" fill="#f0f7ff" stroke="#e0f2fe" stroke-width="1.5" />' +
        '<path d="M 44 46 C 49 40, 55 40, 60 46 C 65 52, 71 52, 76 46" stroke="#2dd4bf" stroke-width="3" stroke-linecap="round" fill="none"/>' +
        '<path d="M 148 64 C 153 58, 159 58, 164 64 C 169 70, 175 70, 180 64" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" fill="none"/>' +
        '<path d="M 28 92 C 32 89, 36 87, 37 84" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" fill="none"/>' +
        '<circle cx="42" cy="100" r="5" fill="none" stroke="#f472b6" stroke-width="2" />' +
        '<circle cx="158" cy="106" r="5.5" fill="none" stroke="#f472b6" stroke-width="2" />' +
        '<circle cx="126" cy="154" r="5" fill="none" stroke="#67e8f9" stroke-width="2" />' +
        '<circle cx="97" cy="42" r="2.5" fill="#f472b6" />' +
        '<circle cx="48" cy="78" r="2.5" fill="#f472b6" />' +
        '<circle cx="68" cy="138" r="2.5" fill="#f472b6" />' +
        '<circle cx="51" cy="120" r="7" fill="#5eead4" fill-opacity="0.9" />' +
        '<circle cx="147" cy="76" r="2" fill="#fde047" />' +
        '<circle cx="157" cy="124" r="2" fill="#fde047" />' +
        '<polygon points="110,26 117,33 108,37" fill="#38bdf8" />' +
        '<polygon points="132,46 140,54 126,55" fill="#fde047" />' +
        '<polygon points="56,60 52,68 62,67" fill="#6ee7b7" />' +
        '<polygon points="144,136 150,144 140,145" fill="#6ee7b7" />' +
        '<polygon points="168,88 174,96 166,101 160,93" fill="#fde047" />' +
        '<circle cx="100" cy="100" r="46" fill="#e8fdf0" stroke="#22c55e" stroke-width="7" />' +
        '<path d="M 80 100 L 94 114 L 122 84" fill="none" stroke="#22c55e" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />' +
    '</svg>';
}

class FormsService {
    /**
     * Export all submissions for a given form as CSV
     * @param {string} formId
     * @returns {Promise<string>}
     */
    async exportSubmissionsCSV(formId) {
        if (!formId || !isValidFormId(formId)) {
            throw new errors.NotFoundError({
                message: tpl(messages.formNotFound)
            });
        }

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
                    let strVal = String(val);
                    if (/^[=+@\t\r-]/i.test(strVal)) {
                        strVal = `'${strVal}`;
                    }
                    row.push(strVal);
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
        if (!formId || !isValidFormId(formId)) {
            throw new errors.NotFoundError({
                message: tpl(messages.formNotFound)
            });
        }

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

        const allowedKeys = new Set(fields.map(f => f.id).concat(fields.map(f => f.name)).filter(Boolean));
        const sanitizedData = {};
        if (allowedKeys.size > 0) {
            for (const key of Object.keys(data)) {
                if (allowedKeys.has(key)) {
                    const val = data[key];
                    if (val !== undefined && val !== null) {
                        sanitizedData[key] = typeof val === 'string' ? val.slice(0, 10000) : val;
                    }
                }
            }
        } else {
            for (const [key, val] of Object.entries(data)) {
                if (key.length <= 100 && val !== undefined && val !== null) {
                    sanitizedData[key] = typeof val === 'string' ? val.slice(0, 10000) : val;
                }
            }
        }

        const submission = await models.FormSubmission.add({
            form_id: form.id,
            data: JSON.stringify(sanitizedData)
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

    /**
     * Generate complete, self-contained HTML form markup for embedding or attaching
     * @param {Object} form - Form model or plain object
     * @param {string} formId
     * @returns {string}
     */
    renderFormHtmlMarkup(form, formId) {
        if (!formId || !isValidFormId(formId)) {
            return '';
        }

        const safeFormId = escapeHtml(formId);
        const status = (form && typeof form.get === 'function' ? form.get('status') : form && form.status) || 'active';

        // When archived, retain attachment marker and embed script with hidden, inert markup
        if (status !== 'active') {
            return `<div data-ghost-form="${safeFormId}" class="ghost-form-archived" style="display: none;" aria-hidden="true"></div><script src="/ghost/api/content/forms/${safeFormId}/embed.js" async></script>`;
        }

        let schema = form && (typeof form.get === 'function' ? form.get('schema') : form.schema);
        if (typeof schema === 'string') {
            try {
                schema = JSON.parse(schema);
            } catch (e) {
                schema = {fields: []};
            }
        }
        const fields = (schema && Array.isArray(schema.fields)) ? schema.fields : [];
        const rawCustomCss = (schema && schema.custom_css) || (form && typeof form.get === 'function' ? form.get('custom_css') : form && form.custom_css) || '';
        const customCss = sanitizeCustomCss(rawCustomCss);
        const name = (form && typeof form.get === 'function' ? form.get('name') : form && form.name) || 'Form';
        const description = (form && typeof form.get === 'function' ? form.get('description') : form && form.description) || '';
        const defaultSuccessTitle = 'Your form was successfully submitted!';
        const defaultSuccessMessage = 'Thank you! Your response has been recorded.';
        const successTitle = (schema && schema.success_title) ? schema.success_title : defaultSuccessTitle;
        const successMessage = (schema && schema.success_message) ? schema.success_message : defaultSuccessMessage;

        const baseRatingCss = `.ghost-rating-star:hover, .ghost-rating-star:hover ~ .ghost-rating-star, .ghost-rating-radio:checked ~ .ghost-rating-star { color: #f59e0b !important; } .ghost-form-rating-wrapper:hover .ghost-rating-star { color: #cbd5e1 !important; } .ghost-form-rating-wrapper .ghost-rating-star:hover, .ghost-form-rating-wrapper .ghost-rating-star:hover ~ .ghost-rating-star { color: #f59e0b !important; }`;
        const baseFormCss = `
.ghost-form-container * { box-sizing: border-box; }
.ghost-form-title { font-size: 26px !important; font-weight: 700 !important; line-height: 1.3 !important; margin: 0 0 10px 0 !important; }
.ghost-form-description { font-size: 16px !important; line-height: 1.5 !important; margin: 0 0 24px 0 !important; color: #64748b !important; }
.ghost-form-group { margin-bottom: 22px !important; }
.ghost-form-label { display: block !important; margin-bottom: 8px !important; font-weight: 600 !important; font-size: 15px !important; line-height: 1.4 !important; color: #1e293b !important; }
.ghost-form-input { font-size: 16px !important; }
.ghost-form-btn { font-size: 16px !important; }
.ghost-form-success-title { font-size: 26px !important; font-weight: 700 !important; color: #1e293b !important; margin: 24px 0 10px 0 !important; line-height: 1.35 !important; text-align: center !important; }
.ghost-form-success-desc { font-size: 16px !important; color: #64748b !important; margin: 0 0 24px 0 !important; line-height: 1.5 !important; text-align: center !important; }
.ghost-form-reset-btn { display: inline-block !important; background: transparent !important; border: 1px solid #cbd5e1 !important; border-radius: 8px !important; padding: 10px 20px !important; font-size: 15px !important; font-weight: 500 !important; cursor: pointer !important; color: #475569 !important; transition: all 0.2s !important; }
.ghost-form-reset-btn:hover { border-color: #94a3b8 !important; color: #1e293b !important; background: #f8fafc !important; }
`;
        const styleHtml = `<style>${baseRatingCss} ${baseFormCss}${customCss ? ' ' + customCss : ''}</style>`;

        const fieldsHtml = fields.map((f) => {
            const reqAttr = f.required ? ' required' : '';
            const reqStar = f.required ? ' <span style="color: #e53e3e;">*</span>' : '';
            const fieldKey = escapeHtml(f.name || f.id || '');
            const fieldId = escapeHtml(f.id || f.name || '');
            const label = escapeHtml(f.label || 'Untitled Field');
            const placeholder = escapeHtml(f.placeholder || '');

            if (f.type === 'textarea') {
                return `<div class="ghost-form-group" style="margin-bottom: 22px;">` +
                    `<label class="ghost-form-label" style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 15px; line-height: 1.4; color: #1e293b;">${label}${reqStar}</label>` +
                    `<textarea class="ghost-form-input" name="${fieldKey}" placeholder="${placeholder}" rows="4"${reqAttr} style="width: 100%; min-height: 130px; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 16px; line-height: 1.5; box-sizing: border-box;"></textarea>` +
                `</div>`;
            }

            if (f.type === 'checkbox') {
                return `<div class="ghost-form-group ghost-form-checkbox-group" style="margin-bottom: 22px; display: flex; align-items: center; gap: 10px;">` +
                    `<input type="checkbox" class="ghost-form-checkbox" name="${fieldKey}" id="ghost-field-${fieldId}"${reqAttr} style="width: 18px; height: 18px; accent-color: #111827; border-radius: 4px; cursor: pointer;">` +
                    `<label class="ghost-form-label" for="ghost-field-${fieldId}" style="font-size: 15px; font-weight: 500; cursor: pointer; margin-bottom: 0; color: #1e293b;">${label}${reqStar}</label>` +
                `</div>`;
            }

            if (f.type === 'select') {
                const opts = (f.options || []).map((opt) => {
                    const safeOpt = escapeHtml(opt);
                    return `<option value="${safeOpt}">${safeOpt}</option>`;
                }).join('');
                return `<div class="ghost-form-group" style="margin-bottom: 22px;">` +
                    `<label class="ghost-form-label" style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 15px; line-height: 1.4; color: #1e293b;">${label}${reqStar}</label>` +
                    `<select class="ghost-form-input" name="${fieldKey}"${reqAttr} style="width: 100%; min-height: 48px; height: 48px; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 16px; line-height: 1.5; box-sizing: border-box; background-color: #ffffff;">` +
                        `<option value="">${placeholder || 'Select an option'}</option>${opts}` +
                    `</select>` +
                `</div>`;
            }

            if (f.type === 'radio') {
                const radioOpts = (f.options || []).map((opt, i) => {
                    const safeOpt = escapeHtml(opt);
                    return `<label class="ghost-form-radio-label" style="display: flex; align-items: center; gap: 10px; font-size: 15px; cursor: pointer; margin-bottom: 0; color: #1e293b;">` +
                        `<input type="radio" class="ghost-form-radio" name="${fieldKey}" value="${safeOpt}" id="ghost-field-${fieldId}-${i}"${reqAttr} style="width: 18px; height: 18px; accent-color: #111827; cursor: pointer;">` +
                        `<span>${safeOpt}</span>` +
                    `</label>`;
                }).join('');
                return `<div class="ghost-form-group" style="margin-bottom: 22px;">` +
                    `<label class="ghost-form-label" style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 15px; line-height: 1.4; color: #1e293b;">${label}${reqStar}</label>` +
                    `<div class="ghost-form-radio-group" style="display: flex; flex-direction: column; gap: 8px;">` +
                        radioOpts +
                    `</div>` +
                `</div>`;
            }

            if (f.type === 'rating') {
                const stars = [5, 4, 3, 2, 1].map((num) => {
                    return `<input type="radio" id="ghost-star-${fieldId}-${num}" name="${fieldKey}" value="${num}" class="ghost-rating-radio"${reqAttr} style="position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none;">` +
                        `<label for="ghost-star-${fieldId}-${num}" class="ghost-rating-star" title="${num} star${num > 1 ? 's' : ''}" style="font-size: 30px; cursor: pointer; color: #cbd5e1; transition: color 0.15s; line-height: 1;">★</label>`;
                }).join('');
                return `<div class="ghost-form-group" style="margin-bottom: 22px;">` +
                    `<label class="ghost-form-label" style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 15px; line-height: 1.4; color: #1e293b;">${label}${reqStar}</label>` +
                    `<div class="ghost-form-rating-wrapper" style="display: inline-flex; flex-direction: row-reverse; gap: 6px;">` +
                        stars +
                    `</div>` +
                `</div>`;
            }

            let inputType = f.type || 'text';
            if (f.type === 'phone') {
                inputType = 'tel';
            }

            return `<div class="ghost-form-group" style="margin-bottom: 22px;">` +
                `<label class="ghost-form-label" style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 15px; line-height: 1.4; color: #1e293b;">${label}${reqStar}</label>` +
                `<input class="ghost-form-input" type="${escapeHtml(inputType)}" name="${fieldKey}" placeholder="${placeholder}"${reqAttr} style="width: 100%; min-height: 48px; height: 48px; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 16px; line-height: 1.5; box-sizing: border-box; background-color: #ffffff;">` +
            `</div>`;
        }).join('');

        const descHtml = description ? `<p class="ghost-form-description" style="margin-top: 0; margin-bottom: 24px; color: #64748b; font-size: 16px; line-height: 1.5;">${escapeHtml(description)}</p>` : '';

        // Safe inline submit handler that functions with or without external JS
        const submitHandlerCode = `event.preventDefault(); var form = this; var btn = form.querySelector('button[type=submit]'); var msg = form.querySelector('.ghost-form-msg'); var body = document.getElementById('ghost-form-body-${safeFormId}'); var success = document.getElementById('ghost-form-success-${safeFormId}'); var data = {}; new FormData(form).forEach(function(val, key) { data[key] = val; }); if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.innerText = 'Submitting...'; } if (msg) { msg.style.display = 'none'; } fetch('/ghost/api/content/forms/${safeFormId}/submissions', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }).then(function(res) { return res.json().then(function(bodyData) { if (!res.ok) throw new Error((bodyData.errors && bodyData.errors[0] && bodyData.errors[0].message) || 'Submission failed'); return bodyData; }); }).then(function() { form.reset(); if (body) { body.style.display = 'none'; } if (success) { success.style.display = 'block'; } }).catch(function(err) { if (msg) { msg.style.display = 'block'; msg.style.color = '#dc2626'; msg.innerText = err.message || 'Something went wrong. Please try again.'; } }).finally(function() { if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.innerText = 'Submit'; } });`;

        return `<div data-ghost-form="${safeFormId}">` +
            styleHtml +
            `<div id="ghost-form-container-${safeFormId}" class="ghost-form-container" style="width: 100%; max-width: 720px; box-sizing: border-box; margin: 40px auto; padding: 36px 32px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">` +
                `<div id="ghost-form-body-${safeFormId}" class="ghost-form-body">` +
                    `<h3 class="ghost-form-title" style="margin-top: 0; margin-bottom: 10px; font-size: 26px; font-weight: 700; line-height: 1.3;">${escapeHtml(name)}</h3>` +
                    descHtml +
                    `<form id="ghost-form-${safeFormId}" class="ghost-form" onsubmit="${submitHandlerCode}">` +
                        fieldsHtml +
                        `<button type="submit" id="ghost-form-btn-${safeFormId}" class="ghost-form-btn" style="width: 100%; min-height: 50px; padding: 14px 28px; background: #111827; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; transition: opacity 0.2s, background-color 0.2s;">Submit</button>` +
                        `<div id="ghost-form-msg-${safeFormId}" class="ghost-form-msg" style="margin-top: 14px; font-size: 15px; display: none;"></div>` +
                    `</form>` +
                `</div>` +
                `<div id="ghost-form-success-${safeFormId}" class="ghost-form-success" style="display: none; text-align: center; padding: 20px 10px 10px 10px;">` +
                    getCelebrationSvg() +
                    `<h3 class="ghost-form-success-title">${escapeHtml(successTitle)}</h3>` +
                    `<p class="ghost-form-success-desc">${escapeHtml(successMessage)}</p>` +
                    `<button type="button" class="ghost-form-reset-btn" onclick="var b=document.getElementById('ghost-form-body-${safeFormId}'); var f=document.getElementById('ghost-form-${safeFormId}'); var s=document.getElementById('ghost-form-success-${safeFormId}'); if(f){ f.reset(); } if(b){ b.style.display='block'; } if(s){ s.style.display='none'; }">Submit another response</button>` +
                `</div>` +
            `</div>` +
        `</div>` +
        `<script src="/ghost/api/content/forms/${safeFormId}/embed.js" async></script>`;
    }

    async generateEmbedScript(formId) {
        if (!formId || !isValidFormId(formId)) {
            return '';
        }
        const safeFormId = escapeHtml(formId);
        const form = await models.Form.findOne({id: formId});
        if (!form || form.get('status') !== 'active') {
            // Form is deleted or archived: hide and clear the form from any post/page DOM!
            return `(function() {
  try {
    var els = document.querySelectorAll('[data-ghost-form="${safeFormId}"]');
    els.forEach(function(el) {
      el.style.display = 'none';
      el.innerHTML = '';
      el.setAttribute('aria-hidden', 'true');
    });
    var containers = document.querySelectorAll('#ghost-form-container-${safeFormId}');
    containers.forEach(function(el) { el.remove(); });
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
        const rawCustomCss = (schema && schema.custom_css) || form.get('custom_css') || '';
        const customCss = sanitizeCustomCss(rawCustomCss);
        const name = form.get('name') || 'Form';
        const description = form.get('description') || '';
        const defaultSuccessTitle = 'Your form was successfully submitted!';
        const defaultSuccessMessage = 'Thank you! Your response has been recorded.';
        const successTitle = (schema && schema.success_title) ? schema.success_title : defaultSuccessTitle;
        const successMessage = (schema && schema.success_message) ? schema.success_message : defaultSuccessMessage;

        return `(function() {
  var formId = ${JSON.stringify(formId)};
  var name = ${JSON.stringify(name)};
  var description = ${JSON.stringify(description)};
  var fields = ${JSON.stringify(fields)};
  var customCss = ${JSON.stringify(customCss)};
  var successTitle = ${JSON.stringify(successTitle)};
  var successMessage = ${JSON.stringify(successMessage)};
  var celebrationSvg = ${JSON.stringify(getCelebrationSvg())};

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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

    target.style.display = '';
    target.removeAttribute('aria-hidden');

    var baseRatingCss = '.ghost-rating-star:hover, .ghost-rating-star:hover ~ .ghost-rating-star, .ghost-rating-radio:checked ~ .ghost-rating-star { color: #f59e0b !important; } .ghost-form-rating-wrapper:hover .ghost-rating-star { color: #cbd5e1 !important; } .ghost-form-rating-wrapper .ghost-rating-star:hover, .ghost-form-rating-wrapper .ghost-rating-star:hover ~ .ghost-rating-star { color: #f59e0b !important; }';
    var baseFormCss = '.ghost-form-container * { box-sizing: border-box; } .ghost-form-title { font-size: 26px !important; font-weight: 700 !important; line-height: 1.3 !important; margin: 0 0 10px 0 !important; } .ghost-form-description { font-size: 16px !important; line-height: 1.5 !important; margin: 0 0 24px 0 !important; color: #64748b !important; } .ghost-form-group { margin-bottom: 22px !important; } .ghost-form-label { display: block !important; margin-bottom: 8px !important; font-weight: 600 !important; font-size: 15px !important; line-height: 1.4 !important; color: #1e293b !important; } .ghost-form-input { font-size: 16px !important; } .ghost-form-btn { font-size: 16px !important; } .ghost-form-success-title { font-size: 26px !important; font-weight: 700 !important; color: #1e293b !important; margin: 24px 0 10px 0 !important; line-height: 1.35 !important; text-align: center !important; } .ghost-form-success-desc { font-size: 16px !important; color: #64748b !important; margin: 0 0 24px 0 !important; line-height: 1.5 !important; text-align: center !important; } .ghost-form-reset-btn { display: inline-block !important; background: transparent !important; border: 1px solid #cbd5e1 !important; border-radius: 8px !important; padding: 10px 20px !important; font-size: 15px !important; font-weight: 500 !important; cursor: pointer !important; color: #475569 !important; transition: all 0.2s !important; } .ghost-form-reset-btn:hover { border-color: #94a3b8 !important; color: #1e293b !important; background: #f8fafc !important; }';
    var styleHtml = '<style>' + baseRatingCss + ' ' + baseFormCss + (customCss ? ' ' + customCss : '') + '</style>';
    
    var fieldsHtml = fields.map(function(f) {
      var reqAttr = f.required ? ' required' : '';
      var reqStar = f.required ? ' <span style="color: #e53e3e;">*</span>' : '';
      var fieldKey = escapeHtml(f.name || f.id || '');
      var fieldId = escapeHtml(f.id || f.name || '');
      var label = escapeHtml(f.label || 'Untitled Field');
      var placeholder = escapeHtml(f.placeholder || '');
      
      if (f.type === 'textarea') {
        return '<div class="ghost-form-group" style="margin-bottom: 22px;">' +
          '<label class="ghost-form-label" style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 15px; line-height: 1.4; color: #1e293b;">' + label + reqStar + '</label>' +
          '<textarea class="ghost-form-input" name="' + fieldKey + '" placeholder="' + placeholder + '" rows="4"' + reqAttr + ' style="width: 100%; min-height: 130px; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 16px; line-height: 1.5; box-sizing: border-box;"></textarea>' +
        '</div>';
      }
      
      if (f.type === 'checkbox') {
        return '<div class="ghost-form-group ghost-form-checkbox-group" style="margin-bottom: 22px; display: flex; align-items: center; gap: 10px;">' +
          '<input type="checkbox" class="ghost-form-checkbox" name="' + fieldKey + '" id="ghost-field-' + fieldId + '"' + reqAttr + ' style="width: 18px; height: 18px; accent-color: #111827; border-radius: 4px; cursor: pointer;">' +
          '<label class="ghost-form-label" for="ghost-field-' + fieldId + '" style="font-size: 15px; font-weight: 500; cursor: pointer; margin-bottom: 0; color: #1e293b;">' + label + reqStar + '</label>' +
        '</div>';
      }
      
      if (f.type === 'select') {
        var opts = (f.options || []).map(function(opt) {
          var safeOpt = escapeHtml(opt);
          return '<option value="' + safeOpt + '">' + safeOpt + '</option>';
        }).join('');
        return '<div class="ghost-form-group" style="margin-bottom: 22px;">' +
          '<label class="ghost-form-label" style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 15px; line-height: 1.4; color: #1e293b;">' + label + reqStar + '</label>' +
          '<select class="ghost-form-input" name="' + fieldKey + '"' + reqAttr + ' style="width: 100%; min-height: 48px; height: 48px; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 16px; line-height: 1.5; box-sizing: border-box; background-color: #ffffff;">' +
            '<option value="">' + (placeholder || 'Select an option') + '</option>' + opts +
          '</select>' +
        '</div>';
      }

      if (f.type === 'radio') {
        var radioOpts = (f.options || []).map(function(opt, i) {
          var safeOpt = escapeHtml(opt);
          return '<label class="ghost-form-radio-label" style="display: flex; align-items: center; gap: 10px; font-size: 15px; cursor: pointer; margin-bottom: 0; color: #1e293b;">' +
            '<input type="radio" class="ghost-form-radio" name="' + fieldKey + '" value="' + safeOpt + '" id="ghost-field-' + fieldId + '-' + i + '"' + reqAttr + ' style="width: 18px; height: 18px; accent-color: #111827; cursor: pointer;">' +
            '<span>' + safeOpt + '</span>' +
          '</label>';
        }).join('');
        return '<div class="ghost-form-group" style="margin-bottom: 22px;">' +
          '<label class="ghost-form-label" style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 15px; line-height: 1.4; color: #1e293b;">' + label + reqStar + '</label>' +
          '<div class="ghost-form-radio-group" style="display: flex; flex-direction: column; gap: 8px;">' +
            radioOpts +
          '</div>' +
        '</div>';
      }

      if (f.type === 'rating') {
        var starNums = [5, 4, 3, 2, 1];
        var stars = starNums.map(function(num) {
          return '<input type="radio" id="ghost-star-' + fieldId + '-' + num + '" name="' + fieldKey + '" value="' + num + '" class="ghost-rating-radio"' + reqAttr + ' style="position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none;">' +
            '<label for="ghost-star-' + fieldId + '-' + num + '" class="ghost-rating-star" title="' + num + ' star' + (num > 1 ? 's' : '') + '" style="font-size: 30px; cursor: pointer; color: #cbd5e1; transition: color 0.15s; line-height: 1;">★</label>';
        }).join('');
        return '<div class="ghost-form-group" style="margin-bottom: 22px;">' +
          '<label class="ghost-form-label" style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 15px; line-height: 1.4; color: #1e293b;">' + label + reqStar + '</label>' +
          '<div class="ghost-form-rating-wrapper" style="display: inline-flex; flex-direction: row-reverse; gap: 6px;">' +
            stars +
          '</div>' +
        '</div>';
      }

      var inputType = f.type || 'text';
      if (f.type === 'phone') {
        inputType = 'tel';
      }

      return '<div class="ghost-form-group" style="margin-bottom: 22px;">' +
        '<label class="ghost-form-label" style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 15px; line-height: 1.4; color: #1e293b;">' + label + reqStar + '</label>' +
        '<input class="ghost-form-input" type="' + escapeHtml(inputType) + '" name="' + fieldKey + '" placeholder="' + placeholder + '"' + reqAttr + ' style="width: 100%; min-height: 48px; height: 48px; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 16px; line-height: 1.5; box-sizing: border-box; background-color: #ffffff;">' +
      '</div>';
    }).join('');

    var formHtml = styleHtml +
      '<div id="ghost-form-container-' + formId + '" class="ghost-form-container" style="width: 100%; max-width: 720px; box-sizing: border-box; margin: 40px auto; padding: 36px 32px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, \\"Segoe UI\\", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">' +
        '<div id="ghost-form-body-' + formId + '" class="ghost-form-body">' +
          '<h3 class="ghost-form-title" style="margin-top: 0; margin-bottom: 10px; font-size: 26px; font-weight: 700; line-height: 1.3;">' + escapeHtml(name) + '</h3>' +
          (description ? '<p class="ghost-form-description" style="margin-top: 0; margin-bottom: 24px; color: #64748b; font-size: 16px; line-height: 1.5;">' + escapeHtml(description) + '</p>' : '') +
          '<form id="ghost-form-' + formId + '" class="ghost-form">' +
            fieldsHtml +
            '<button type="submit" id="ghost-form-btn-' + formId + '" class="ghost-form-btn" style="width: 100%; min-height: 50px; padding: 14px 28px; background: #111827; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; transition: opacity 0.2s, background-color 0.2s;">Submit</button>' +
            '<div id="ghost-form-msg-' + formId + '" class="ghost-form-msg" style="margin-top: 14px; font-size: 15px; display: none;"></div>' +
          '</form>' +
        '</div>' +
        '<div id="ghost-form-success-' + formId + '" class="ghost-form-success" style="display: none; text-align: center; padding: 20px 10px 10px 10px;">' +
          celebrationSvg +
          '<h3 class="ghost-form-success-title">' + escapeHtml(successTitle) + '</h3>' +
          '<p class="ghost-form-success-desc">' + escapeHtml(successMessage) + '</p>' +
          '<button type="button" class="ghost-form-reset-btn" id="ghost-form-reset-' + formId + '">Submit another response</button>' +
        '</div>' +
      '</div>';

    target.innerHTML = formHtml;

    var formEl = document.getElementById('ghost-form-' + formId);
    var btnEl = document.getElementById('ghost-form-btn-' + formId);
    var msgEl = document.getElementById('ghost-form-msg-' + formId);

    if (formEl && !formEl.__ghostFormInitialized) {
      formEl.__ghostFormInitialized = true;
      formEl.onsubmit = null;
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
          var bodyEl = document.getElementById('ghost-form-body-' + formId);
          var successEl = document.getElementById('ghost-form-success-' + formId);
          if (bodyEl) { bodyEl.style.display = 'none'; }
          if (successEl) { successEl.style.display = 'block'; }
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

    var resetBtnEl = document.getElementById('ghost-form-reset-' + formId);
    if (resetBtnEl && !resetBtnEl.__ghostResetInitialized) {
      resetBtnEl.__ghostResetInitialized = true;
      resetBtnEl.addEventListener('click', function() {
        formEl.reset();
        var bodyEl = document.getElementById('ghost-form-body-' + formId);
        var successEl = document.getElementById('ghost-form-success-' + formId);
        if (bodyEl) { bodyEl.style.display = 'block'; }
        if (successEl) { successEl.style.display = 'none'; }
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
        if (!formId || !isValidFormId(formId)) {
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
        if (!formId || !isValidFormId(formId)) {
            throw new errors.BadRequestError({
                message: 'Invalid form ID.'
            });
        }

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

        const form = await models.Form.findOne({id: formId});
        if (!form) {
            throw new errors.NotFoundError({
                message: 'Form not found.'
            });
        }

        const fullFormSnippet = this.renderFormHtmlMarkup(form, formId);

        let lexical = post.lexical;
        let mobiledoc = post.mobiledoc;
        let html = post.html || '';

        // Clean up any existing form for this formId first from HTML
        const safeIdRegex = escapeRegExp(formId);
        const htmlCardRegex = new RegExp(`\\s*<!--kg-card-begin: html-->[\\s\\S]*?data-ghost-form=["']${safeIdRegex}["'][\\s\\S]*?<!--kg-card-end: html-->\\s*`, 'gi');
        const legacyRegex = new RegExp(`(<div[^>]*data-ghost-form=["']${safeIdRegex}["'][^>]*>(?:<\\/div>)?(?:\\s*<script[^>]*forms\\/${safeIdRegex}\\/embed\\.js[^>]*><\\/script>)?|<div[^>]*id=["']ghost-form-container-${safeIdRegex}["'][\\s\\S]*?<\\/div>(?:\\s*<script[\\s\\S]*?<\\/script>)?|<script[^>]*forms\\/${safeIdRegex}\\/embed\\.js[^>]*><\\/script>)`, 'gi');
        html = html.replace(htmlCardRegex, '\n').replace(legacyRegex, '');

        const wrappedCardHtml = `\n<!--kg-card-begin: html-->\n${fullFormSnippet}\n<!--kg-card-end: html-->\n`;
        if (placement === 'start') {
            html = wrappedCardHtml + html;
        } else {
            html = html + wrappedCardHtml;
        }

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
                        html: fullFormSnippet
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
                    const remainingCards = [];
                    const cardIndexMap = {};
                    docObj.cards.forEach((card, idx) => {
                        const isTarget = card[0] === 'html' && JSON.stringify(card[1]).includes(formId);
                        if (!isTarget) {
                            cardIndexMap[idx] = remainingCards.length;
                            remainingCards.push(card);
                        }
                    });
                    const cardIndex = remainingCards.length;
                    remainingCards.push(['html', {html: fullFormSnippet}]);
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
                        html: fullFormSnippet
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
            html,
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
        if (!formId || !isValidFormId(formId)) {
            throw new errors.BadRequestError({
                message: 'Invalid form ID.'
            });
        }

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
            const safeIdRegex = escapeRegExp(formId);
            const htmlCardRegex = new RegExp(`\\s*<!--kg-card-begin: html-->[\\s\\S]*?data-ghost-form=["']${safeIdRegex}["'][\\s\\S]*?<!--kg-card-end: html-->\\s*`, 'gi');
            const legacyRegex = new RegExp(`(<div[^>]*data-ghost-form=["']${safeIdRegex}["'][^>]*>(?:<\\/div>)?(?:\\s*<script[^>]*forms\\/${safeIdRegex}\\/embed\\.js[^>]*><\\/script>)?|<div[^>]*id=["']ghost-form-container-${safeIdRegex}["'][\\s\\S]*?<\\/div>(?:\\s*<script[\\s\\S]*?<\\/script>)?|<script[^>]*forms\\/${safeIdRegex}\\/embed\\.js[^>]*><\\/script>)`, 'gi');
            html = html.replace(htmlCardRegex, '\n').replace(legacyRegex, '');
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
     * Invoked automatically whenever a form is deleted.
     * @param {string} formId
     * @returns {Promise<number>} Number of posts cleaned up
     */
    async cleanupFormFromPostsAndPages(formId) {
        if (!formId || !isValidFormId(formId)) {
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

            const safeIdRegex = escapeRegExp(formId);
            const htmlCardRegex = new RegExp(`\\s*<!--kg-card-begin: html-->[\\s\\S]*?data-ghost-form=["']${safeIdRegex}["'][\\s\\S]*?<!--kg-card-end: html-->\\s*`, 'gi');
            const legacyRegex = new RegExp(`(<div[^>]*data-ghost-form=["']${safeIdRegex}["'][^>]*>(?:<\\/div>)?(?:\\s*<script[^>]*forms\\/${safeIdRegex}\\/embed\\.js[^>]*><\\/script>)?|<div[^>]*id=["']ghost-form-container-${safeIdRegex}["'][\\s\\S]*?<\\/div>(?:\\s*<script[\\s\\S]*?<\\/script>)?|<script[^>]*forms\\/${safeIdRegex}\\/embed\\.js[^>]*><\\/script>)`, 'gi');

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
                    html = html.replace(htmlCardRegex, '\n').replace(legacyRegex, '');
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

    /**
     * Synchronize updated form HTML markup to all posts and pages where it is attached.
     * Preserves attachments during archiving (rendering inert hidden placeholder),
     * and restores full active markup when form is active.
     * @param {string} formId
     * @returns {Promise<number>} Number of posts/pages updated
     */
    async syncFormToAttachedPosts(formId) {
        if (!formId || !isValidFormId(formId)) {
            return 0;
        }
        try {
            const form = await models.Form.findOne({id: formId});
            // Only clean up if the form was permanently removed from database
            if (!form) {
                return this.cleanupFormFromPostsAndPages(formId);
            }

            const knex = models.Base.knex;
            const affectedPosts = await knex('posts')
                .where(function () {
                    this.where('lexical', 'like', `%${formId}%`)
                        .orWhere('mobiledoc', 'like', `%${formId}%`)
                        .orWhere('html', 'like', `%${formId}%`);
                });

            if (!affectedPosts || affectedPosts.length === 0) {
                return 0;
            }

            const fullFormSnippet = this.renderFormHtmlMarkup(form, formId);
            const safeIdRegex = escapeRegExp(formId);
            const htmlCardRegex = new RegExp(`\\s*<!--kg-card-begin: html-->[\\s\\S]*?data-ghost-form=["']${safeIdRegex}["'][\\s\\S]*?<!--kg-card-end: html-->\\s*`, 'gi');
            const legacyRegex = new RegExp(`(<div[^>]*data-ghost-form=["']${safeIdRegex}["'][^>]*>(?:<\\/div>)?(?:\\s*<script[^>]*forms\\/${safeIdRegex}\\/embed\\.js[^>]*><\\/script>)?|<div[^>]*id=["']ghost-form-container-${safeIdRegex}["'][\\s\\S]*?<\\/div>(?:\\s*<script[\\s\\S]*?<\\/script>)?|<script[^>]*forms\\/${safeIdRegex}\\/embed\\.js[^>]*><\\/script>)`, 'gi');
            const wrappedSnippet = `\n<!--kg-card-begin: html-->\n${fullFormSnippet}\n<!--kg-card-end: html-->\n`;

            for (const post of affectedPosts) {
                let lexical = post.lexical;
                let mobiledoc = post.mobiledoc;
                let html = post.html || '';

                if (lexical) {
                    try {
                        const lexObj = JSON.parse(lexical);
                        if (lexObj && lexObj.root && Array.isArray(lexObj.root.children)) {
                            let matched = false;
                            lexObj.root.children.forEach((child) => {
                                if (child.type === 'html' && typeof child.html === 'string' && child.html.includes(formId)) {
                                    child.html = fullFormSnippet;
                                    matched = true;
                                }
                            });
                            if (matched) {
                                lexical = JSON.stringify(lexObj);
                            }
                        }
                    } catch (e) {
                        // Ignore parse error
                    }
                }

                if (mobiledoc) {
                    try {
                        const docObj = JSON.parse(mobiledoc);
                        if (docObj && Array.isArray(docObj.cards)) {
                            let matched = false;
                            docObj.cards.forEach((card) => {
                                if (card[0] === 'html' && JSON.stringify(card[1]).includes(formId)) {
                                    card[1].html = fullFormSnippet;
                                    matched = true;
                                }
                            });
                            if (matched) {
                                mobiledoc = JSON.stringify(docObj);
                            }
                        }
                    } catch (e) {
                        // Ignore parse error
                    }
                }

                if (html && typeof html === 'string') {
                    htmlCardRegex.lastIndex = 0;
                    legacyRegex.lastIndex = 0;
                    if (htmlCardRegex.test(html)) {
                        htmlCardRegex.lastIndex = 0;
                        html = html.replace(htmlCardRegex, wrappedSnippet);
                    } else if (legacyRegex.test(html)) {
                        legacyRegex.lastIndex = 0;
                        html = html.replace(legacyRegex, wrappedSnippet);
                    }
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
