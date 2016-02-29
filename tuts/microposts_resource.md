---
layout: tuts
title: The Microposts resource
prev_section: users_resource
next_section: static_pages
permalink: /tuts/microposts_resource/
---

As with the Microposts resource, we'll generate scaffold code for the Microposts resource
using `trainjs generate scaffold`

{% highlight bash %}
~/toy_app $ trainjs generate scaffold Micropost content:text user_id:integer
	identical  .sequelizerc
	   create  app/controllers/microposts_controller.js
	   create  app/models/micropost.js
	identical  config/database.json
	   create  db/migrate/20151229221845_create_microposts.js
	identical  public/assets/stylesheets/form-for.css
	identical  public/assets/stylesheets/scaffolds.css
	   create  public/controllers/microposts_controller.js
	identical  public/directives/alert.js
	identical  public/helpers/alert.js
	   create  public/partials/controller_name
	   create  public/partials/microposts/form.html
	   create  public/partials/microposts/index.html
	   create  public/partials/microposts/show.html
	   create  public/services/micropost.js
{% endhighlight %}

To update our database with the new data model, we need to run a migration

{% highlight bash %}
~/toy_app $ sequelize db:migrate
Loaded configuration file "config/database.json".
Using environment "development".
Using gulpfile /usr/lib/node_modules/sequelize-cli/lib/gulpfile.js
Starting 'db:migrate'...
== 20151229221845_create_microposts: migrating =======
== 20151229221845_create_microposts: migrated (0.256s)
{% endhighlight %}

The [trainjs](https://nodeontrain.xyz) routes, with a new rule for Microposts resources.

{% highlight javascript %}
module.exports = [
	{ resources: 'users' },
	{ resources: 'microposts' },
];
{% endhighlight %}

<div class="mobile-side-scroller">
<table>
  <thead>
	<tr>
	  <th>HTTP request</th>
	  <th>URI</th>
	  <th>Action</th>
	  <th>Purpose</th>
	</tr>
  </thead>
  <tbody>
	<tr>
	  <td><p>GET</p></td>
	  <td><p><code>/microposts</code></p></td>
	  <td><p><code class="option">index</code></p></td>
	  <td><p>page to list all microposts</p></td>
	</tr>
	<tr>
	  <td><p>GET</p></td>
	  <td><p><code>/microposts/1</code></p></td>
	  <td><p><code class="option">show</code></p></td>
	  <td><p>page to show micropost with id 1</p></td>
	</tr>
	<tr>
	  <td><p>GET</p></td>
	  <td><p><code>/microposts/new</code></p></td>
	  <td><p><code class="option">new</code></p></td>
	  <td><p>page to make a new micropost</p></td>
	</tr>
	<tr>
	  <td><p>POST</p></td>
	  <td><p><code>/microposts</code></p></td>
	  <td><p><code class="option">create</code></p></td>
	  <td><p>create a new micropost</p></td>
	</tr>
	<tr>
	  <td><p>GET</p></td>
	  <td><p><code>/microposts/1/edit</code></p></td>
	  <td><p><code class="option">edit</code></p></td>
	  <td><p>page to edit micropost with id 1</p></td>
	</tr>
	<tr>
	  <td><p>PUT</p></td>
	  <td><p><code>/microposts/1</code></p></td>
	  <td><p><code class="option">update</code></p></td>
	  <td><p>update micropost with id 1</p></td>
	</tr>
	<tr>
	  <td><p>DELETE</p></td>
	  <td><p><code>/microposts/1</code></p></td>
	  <td><p><code class="option">destroy</code></p></td>
	  <td><p>delete micropost with id 1</p></td>
	</tr>
  </tbody>
</table>
</div>

The Microposts controller in schematic form.

{% highlight javascript %}
function MicropostsController() {

	this.index = function(req, res, next) {
		var microposts = ModelSync( Micropost.findAll() );
		res.end(JSON.stringify(microposts));
	};

	this.create = function(req, res, next) {
		var micropost = ModelSync( Micropost.create(req.body) );
		res.end(JSON.stringify(micropost));
	};

	this.show = function(req, res, next) {
		var micropost = ModelSync( Micropost.findById(req.params.id) );
		res.end(JSON.stringify(micropost));
	};

	this.update = function(req, res, next) {
		var micropost = ModelSync( Micropost.findById(req.params.id) );
		micropost.update(req.body).then(function(_micropost) {
			res.end(JSON.stringify(_micropost));
		})
	};

	this.destroy = function(req, res, next) {
		var micropost = ModelSync( Micropost.findById(req.params.id) );
		micropost.destroy();
		res.end();
	};

}

module.exports = MicropostsController;
{% endhighlight %}

The Micropost model for the demo application.

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;

var Micropost = sequelize.define('micropost', {
	content: {
		type: Sequelize.TEXT,
	},
	user_id: {
		type: Sequelize.INTEGER,
	},

}, {
	freezeTableName: true // Model tableName will be the same as the model name
});

module.exports = Micropost;
{% endhighlight %}

You can also specify associations between the `User` model and the `Micropost` model. In the case of our User model, each user potentially has many microposts.

A user has many microposts.

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;

var User = sequelize.define('user', {
	name: {
		type: Sequelize.STRING,
	},
	email: {
		type: Sequelize.STRING,
	},

}, {
	freezeTableName: true // Model tableName will be the same as the model name
});

User.associations = [
	{ hasMany: 'Micropost' }
];

module.exports = User;
{% endhighlight %}

A micropost belongs to a user.

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;

var Micropost = sequelize.define('micropost', {
	content: {
		type: Sequelize.TEXT,
		allowNull: false,
		validate: {
			len: [1, 140]
		}
	},
	user_id: {
		type: Sequelize.INTEGER,
	},

}, {
	freezeTableName: true // Model tableName will be the same as the model name
});

Micropost.associations = [
	{ belongsTo: 'User' }
];

module.exports = Micropost;
{% endhighlight %}

We go to <a href="http://demo.nodeontrain.xyz/#/microposts" target="_blank">http://0.0.0.0:1337/#/microposts</a> for listing all microposts
