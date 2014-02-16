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

  var SettingsGeneralField = React.createClass({
    render: function() {
      return this.transferPropsTo(
        <div className="form-group">
          <label htmlFor={this.props.children.props.id}>{this.props.caption}</label>
          {this.props.children}
          <p>{this.props.subtitle}</p>
        </div>
      );
    }
  });

  var SettingsGeneralContent = React.createClass({
    render: function() {
      if (!this.props.hasOwnProperty('title')) {
        // Data hasn't loaded yet. Display a loading indicator of some kind.
        return <div>Loading...</div>;
      }

      var logo;
      var cover;

      if (this.props.logo) {
        logo = <a className="js-modal-logo" id="blog-logo" href="#"><img src={this.props.logo} alt="logo" /></a>;
      } else {
        logo = <a className="button-add js-modal-logo" id="blog-logo">Upload Image</a>;
      }

      if (this.props.cover) {
        cover = <a className="js-modal-cover" href="#" id="blog-cover"><img src={this.props.cover} alt="cover photo" /></a>;
      } else {
        cover = <a className="button-add js-modal-cover" id="blog-cover">Upload Image</a>;
      }

      var availableThemes = this.props.availableThemes.map(function(theme) {
        return <option defaultValue={theme.name} key={theme.name} selected={theme.selected}>{theme.name}</option>
      });

      return (
        <section className="content">
          <form id="settings-general" novalidate="novalidate">
            <fieldset>

              <SettingsGeneralField caption="Blog Title" subtitle="The name of your blog">
                <input id="blog-title" name="general[title]" type="text" defaultValue={this.props.title} />
              </SettingsGeneralField>

              <SettingsGeneralField
                className="description-container"
                caption="Blog Description"
                subtitle={<span>Describe what your blog is about <span className="word-count">0</span></span>}>
                <textarea id="blog-description" defaultValue={this.props.description} />
              </SettingsGeneralField>
            </fieldset>

            <SettingsGeneralField caption="Blog Logo" subtitle="Display a sexy logo for your publication">
              {logo}
            </SettingsGeneralField>

            <SettingsGeneralField caption="Blog Cover" subtitle="Display a cover image on your site">
              {cover}
            </SettingsGeneralField>

            <fieldset>
              <SettingsGeneralField caption="Email Address" subtitle="Address to use for admin notifications">
                <input id="email-address" name="general[email-address]" type="email" defaultValue={this.props.email} autoCapitalize="off" autoCorrect="off" />
              </SettingsGeneralField>

              <SettingsGeneralField caption="Posts per page" subtitle="How many posts should be displayed on each page">
                <input id="postsPerPage" name="general[postsPerPage]" type="number" defaultValue={this.props.postsPerPage} />
              </SettingsGeneralField>

              <SettingsGeneralField caption="Dated Permalinks" subtitle="Include the date in your post URLs">
                <input id="permalinks" name="general[permalinks]" type="checkbox" defaultValue='permalink'/>
              </SettingsGeneralField>

              <SettingsGeneralField caption="Theme" subtitle="Select a theme for your blog">
                <select id="activeTheme" name="general[activeTheme]">
                  {availableThemes}
                </select>
              </SettingsGeneralField>

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
          {this.transferPropsTo(<SettingsGeneralContent />)}
        </div>
      );
    }
  });

  Ghost.Components.SettingsGeneral = SettingsGeneral;
})();
