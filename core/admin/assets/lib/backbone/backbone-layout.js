// Layout manager
// --------------
/*
 *   .addChild('sidebar', App.View.Sidebar)
 *   .childViews.sidebar.$('blah')
 */

Backbone.Layout = Backbone.View.extend({
    // default to loading state, reverted on render()
    loading: true,

    addViews: function (views) {
        if (!this.views) this.views = {}

        _.each(views, function(view, name){
            if (typeof view.model === 'undefined'){
                view.model = this.model
            }
            this.views[name] = view
        }, this)
        return this
    },

    renderViews: function (data) {
        _.invoke(this.views, 'render', data)
        this.trigger('render')
        return this
    },

    appendViews: function (target) {
        _.each(this.views, function(view){
            this.$el.append(view.el)
        }, this)
        this.trigger('append')
        return this
    },

    destroyViews: function () {
        _.each(this.views, function(view){
            view.model = null
            view.remove()
        })
        return this
    },

    render: function () {
        this.loading = false
        this.renderViews()
        return this
    },

    remove: function () {
        this.destroyViews()
        Backbone.View.prototype.remove.call(this)
    }
})
