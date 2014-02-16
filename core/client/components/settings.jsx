/** @jsx React.DOM */
/*global window, document, Ghost, $, _, Backbone, Countable */
(function () {
  "use strict";

  var SettingsGeneralHeader = React.createClass({
    render: function() {
      return (
        <header>
          <button className="button-back">Back</button>
          <h2 className="title">General</h2>
          <section className="page-actions">
            <button className="button-save">Save</button>
          </section>
        </header>
      );
    }
  });

  var SettingsGeneralContent = React.createClass({
    render: function() {
      return (
        <section className="content">
          <form id="settings-general" novalidate="novalidate">
            <fieldset>

              <div className="form-group">
                <label htmlFor="blog-title">Blog Title</label>
                <input id="blog-title" name="general[title]" type="text" value="{{title}}" />
                <p>The name of your blog</p>
              </div>

              <div className="form-group description-container">
                <label htmlFor="blog-description">Blog Description</label>
                <textarea id="blog-description">{{description}}</textarea>
                <p>
                  Describe what your blog is about
                  <span className="word-count">0</span>
                </p>

              </div>
            </fieldset>
            <div className="form-group">
              <label htmlFor="blog-logo">Blog Logo</label>
              {{#if logo}}
                <a className="js-modal-logo" href="#"><img id="blog-logo" src="{{logo}}" alt="logo"></a>
              {{else}}
                <a className="button-add js-modal-logo" >Upload Image</a>
              {{/if}}
              <p>Display a sexy logo for your publication</p>
            </div>

            <div className="form-group">
              <label htmlFor="blog-cover">Blog Cover</label>
              {{#if cover}}
                <a className="js-modal-cover" href="#"><img id="blog-cover" src="{{cover}}" alt="cover photo"></a>
              {{else}}
                <a className="button-add js-modal-cover">Upload Image</a>
              {{/if}}
              <p>Display a cover image on your site</p>
            </div>
            <fieldset>
              <div className="form-group">
                <label htmlFor="email-address">Email Address</label>
                <input id="email-address" name="general[email-address]" type="email" value="{{email}}" autocapitalize="off" autocorrect="off" />
                <p>Address to use for admin notifications</p>
              </div>

              <div className="form-group">
                <label htmlFor="postsPerPage">Posts per page</label>
                <input id="postsPerPage" name="general[postsPerPage]" type="number" value="{{postsPerPage}}" />
                <p>How many posts should be displayed on each page</p>
              </div>

              <div className="form-group">
                <label htmlFor="permalinks">Dated Permalinks</label>
                <input id="permalinks" name="general[permalinks]" type="checkbox" value='permalink'/>
                <label className="checkbox" htmlFor="permalinks"></label>
                <p>Include the date in your post URLs</p>
              </div>

              <div className="form-group">
                <label htmlFor="activeTheme">Theme</label>
                <select id="activeTheme" name="general[activeTheme]">
                  {{#each availableThemes}}
                    <option value="{{name}}" {{#if active}}selected{{/if}}>{{name}}</option>
                  {{/each}}
                </select>
                <p>Select a theme for your blog</p>
              </div>

            </fieldset>
          </form>
        </section>
      )
    }
  });

  var SettingsGeneral = React.createClass({
    render: function() {
      return (
        <div>
          <SettingsGeneralHeader />
          <SettingsGeneralContent />
        </div>
      );
    }
  });

  Ghost.Components.SettingsGeneral = SettingsGeneral;
})();
