---
layout: tuts
title: A Micropost model
prev_section: password_reset
next_section: showing_microposts
permalink: /tuts/micropost_model/
---

We begin the Microposts resource by creating a Micropost model, which captures the essential characteristics of microposts. What follows builds on the work from ["The Microposts resource Section"](https://nodeontrain.xyz/tuts/microposts_resource/); as with the model in that section, our new Micropost model will include data validations and an association with the User model. Unlike that model, the present Micropost model will be fully tested, and will also have a default ordering and automatic destruction if its parent user is destroyed.

### The basic model

The Micropost model needs only two attributes: a content attribute to hold the micropost's content and a user_id to associate a micropost with a particular user.

As with the case of the [User model](https://nodeontrain.xyz/tuts/user_model/#database-migrations), we generate the Micropost model using generate model

{% highlight bash %}
~/sample_app $ trainjs generate model Micropost content:text user:references
{% endhighlight %}

Because we expect to retrieve all the microposts associated with a given user id in reverse order of creation, we add an index on the `user_id` and `created_at` columns

`db/migrate/[timestamp]_create_microposts.js`

{% highlight javascript %}
module.exports = {
	up: function(migration, DataTypes, done) {
		// add altering commands here, calling 'done' when finished
		migration.createTable('micropost', {
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true
			},
			content: DataTypes.TEXT,
			user_id: {
				type: DataTypes.INTEGER,
				references: {
					model: 'user',
					key: 'id',
				}
			},

			createdAt: DataTypes.DATE,
			updatedAt: DataTypes.DATE,
		});
		migration.addIndex('micropost', ['user_id', 'createdAt']);
		done();
	},
	down: function(migration, DataTypes, done) {
		// add reverting commands here, calling 'done' when finished
		done();
	}
}
{% endhighlight %}

With the migration, we can update the database as usual

{% highlight bash %}
~/sample_app $ sequelize db:migrate
{% endhighlight %}

### Micropost validations

Now that we've created the basic model, we'll add some validations to enforce the desired design constraints. One of the necessary aspects of the Micropost model is the presence of a user id to indicate which user made the micropost.

The initial micropost tests parallel those for the [User model](https://nodeontrain.xyz/tuts/user_validations/#validating-presence).

`test/models/micropost_test.js`

{% highlight javascript %}
require('trainjs').initServer();
var assert = require('assert');

describe('MicropostTest', function () {
	var micropost;

	beforeEach(function() {
		micropost = Micropost.build({content: "Lorem ipsum", user_id: 1});
	});

	it('should be valid', function(done) {
		micropost.validate().then(function(errors){
			assert.equal(errors, undefined);
			done();
		});
	});

	it('user id should be present', function(done) {
		micropost.user_id = null;
		micropost.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});
});
{% endhighlight %}

The validity test is already successful, but the user id presence test should be failing because there are not currently any validations on the Micropost model

{% highlight bash %}
~/sample_app $ mocha test/models/micropost_test.js
  MicropostTest
	✓ should be valid

  1 passing (2s)
  1 failing
{% endhighlight %}

To fix this, we just need to add the user id presence validation

`app/models/micropost.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;

var Micropost = sequelize.define('micropost', {
	content: {
		type: Sequelize.TEXT,
	},
	user_id: {
		type: Sequelize.INTEGER,
		allowNull: false,
		validate: {
			notEmpty: true
		},
		references: {
			model: 'user',
			key: 'id'
		}
	},

}, {
	freezeTableName: true // Model tableName will be the same as the model name
});

module.exports = Micropost;
{% endhighlight %}

The model tests should now be successful

{% highlight bash %}
~/sample_app $ mocha test/models/micropost_test.js
  MicropostTest
    ✓ should be valid
    ✓ user id should be present

  2 passing (22ms)
{% endhighlight %}

Next, we'll add validations for the micropost's content attribute. As with the `user_id`, the `content` attribute must be present, and it is further constrained to be no longer than 140 characters, making it an honest micropost. We'll first write some simple tests, which generally follow the examples from the [User model validation tests](https://nodeontrain.xyz/tuts/user_validations/)

`test/models/micropost_test.js`

{% highlight javascript %}
require('trainjs').initServer();
var assert = require('assert');

describe('MicropostTest', function () {
	var micropost;

	beforeEach(function() {
		micropost = Micropost.build({content: "Lorem ipsum", user_id: 1});
	});

	it('should be valid', function(done) {
		micropost.validate().then(function(errors){
			assert.equal(errors, undefined);
			done();
		});
	});

	it('user id should be present', function(done) {
		micropost.user_id = null;
		micropost.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});

	it('content should be present', function(done) {
		micropost.content = "     ";
		micropost.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});

	it('content should be at most 140 characters', function(done) {
		micropost.content = "a".repeat(141);
		micropost.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});
});
{% endhighlight %}


`app/models/micropost.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;

var Micropost = sequelize.define('micropost', {
	content: {
		type: Sequelize.TEXT,
		allowNull: false,
		validate: {
			notEmpty: true,
			len: [1,140]
		},
	},
	user_id: {
		type: Sequelize.INTEGER,
		allowNull: false,
		validate: {
			notEmpty: true
		},
		references: {
			model: 'user',
			key: 'id'
		}
	},

}, {
	freezeTableName: true // Model tableName will be the same as the model name
});

module.exports = Micropost;
{% endhighlight %}

At this point, the full test suite should be successful

{% highlight bash %}
~/sample_app $ mocha test/models/micropost_test.js
  MicropostTest
    ✓ should be valid
    ✓ user id should be present
    ✓ content should be present
    ✓ content should be at most 140 characters

  4 passing (27ms)
{% endhighlight %}

### User/Micropost associations

When constructing data models for web applications, it is essential to be able to make associations between individual models. In the present case, each micropost is associated with one user, and each user is associated with (potentially) many microposts

`app/models/micropost.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;

var User = require('./user.js');

var Micropost = sequelize.define('micropost', {
	...
}, {
	freezeTableName: true, // Model tableName will be the same as the model name
	classMethods: {
		associate: function(models) {
			Micropost.belongsTo(models.User, { foreignKey: 'user_id' });
		}
	}
});

module.exports = Micropost;
{% endhighlight %}

`app/models/user.js`

{% highlight javascript %}
...

var User = sequelize.define('user', {
	...
}, {
	...
	classMethods: {
		digest: function(string){
			return bcrypt.hashSync(string, 10);
		},
		new_token: function(){
			var buf = secureRandom.randomBuffer(16);
			return URLSafeBase64.encode(buf);
		},
		associate: function(models) {
			User.hasMany(models.Micropost, { foreignKey: 'user_id' });
		}
	}
});

...
{% endhighlight %}

With the association thus made, we can update the test

`test/models/micropost_test.js`

{% highlight javascript %}
require('trainjs').initServer();
var assert = require('assert');

describe('MicropostTest', function () {
	var micropost;

	beforeEach(function() {
		micropost = Micropost.build({content: "Lorem ipsum", user_id: 1});
	});

	it('user id should be present', function(done) {
		micropost.user_id = null;
		micropost.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});

	it('content should be present', function(done) {
		micropost.content = "     ";
		micropost.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});

	it('content should be at most 140 characters', function(done) {
		micropost.content = "a".repeat(141);
		micropost.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});

	it('should be valid', function(done) {
		micropost.validate().then(function(errors){
			assert.equal(errors, undefined);
			micropost.save().then(function() {
				User.findById(micropost.user_id).then(function(user) {
					user.addMicropost(micropost).then(function() {
						user.hasMicropost(micropost).then(function(result) {
							assert.equal(result, true);
							done();
						});
					});
				});
			});
		});		
	});
});
{% endhighlight %}

Of course, after this minor refactoring the test suite should still be successful

{% highlight bash %}
~/sample_app $ mocha test/models/micropost_test.js
  MicropostTest
    ✓ user id should be present
    ✓ content should be present
    ✓ content should be at most 140 characters
    ✓ should be valid

  4 passing (27ms)
{% endhighlight %}

### Micropost refinements

In this section, we'll add a couple of refinements to the user/micropost association. In particular, we'll arrange for a user's microposts to be retrieved in a specific order, and we'll also make microposts dependent on users so that they will be automatically destroyed if their associated user is destroyed.

#### Default scope

By default, the user.microposts method makes no guarantees about the order of the posts, but (following the convention of blogs and Twitter) we want the microposts to come out in reverse order of when they were created so that the most recent post is first. We'll arrange for this to happen using a default scope.

`test/models/micropost_test.js`

{% highlight javascript %}
require('trainjs').initServer();
var assert = require('assert');

describe('MicropostTest', function () {
	var micropost;

	beforeEach(function() {
		micropost = Micropost.build({content: "Lorem ipsum", user_id: 1});
	});

	...
    
    it('order should be most recent first', function(done) {
		micropost.save().then(function() {
			Micropost.findOne({ where: {content: "Lorem ipsum"} }).then(function(_micropost) {
				assert.equal(_micropost.id, micropost.id);
				done();
			});
		});
	});
});
{% endhighlight %}

The test suite should be failing

{% highlight bash %}
~/sample_app $ mocha test/models/micropost_test.js
  MicropostTest
    ✓ user id should be present
    ✓ content should be present
    ✓ content should be at most 140 characters
    ✓ should be valid

  4 passing (2s)
  1 failing
{% endhighlight %}

Adding this in a default scope for the Micropost model

`app/models/micropost.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;

var User = require('./user.js');

var Micropost = sequelize.define('micropost', {
	...
}, {
	freezeTableName: true, // Model tableName will be the same as the model name
	defaultScope: {
		order: 'createdAt DESC'
	},
	classMethods: {
		associate: function(models) {
			Micropost.belongsTo(models.User, { foreignKey: 'user_id' });
		}
	}
});

module.exports = Micropost;
{% endhighlight %}

With the code, the tests should be successful

{% highlight bash %}
~/sample_app $ mocha test/models/micropost_test.js
  MicropostTest
    ✓ user id should be present
    ✓ content should be present
    ✓ content should be at most 140 characters
    ✓ should be valid (412ms)
    ✓ order should be most recent first (140ms)

  5 passing (581ms)
{% endhighlight %}

#### Dependent: destroy

Apart from proper ordering, there is a second refinement we'd like to add to microposts. Recall from ["Deleting users Section"](https://nodeontrain.xyz/tuts/deleting_users/) that site administrators have the power to destroy users. It stands to reason that, if a user is destroyed, the user's microposts should be destroyed as well.

We can arrange for this behavior by passing an option to the `hasMany` association method

`app/models/user.js`

{% highlight javascript %}
...

var User = sequelize.define('user', {
	...
}, {
	...
	classMethods: {
		...
		associate: function(models) {
			User.hasMany(models.Micropost, { foreignKey: 'user_id', onDelete: 'cascade', hooks: true });
		}
	}
});

...
{% endhighlight %}

We can verify is working with a test for the User model. All we need to do is save the user (so it gets an id) and create an associated micropost. Then we check that destroying the user reduces the micropost count by 1.

`test/models/user_test.js`

{% highlight javascript %}
require('trainjs').initServer();
var assert = require('assert');

describe('UserTest', function () {
	...

	it('associated microposts should be destroyed', function(done) {
		User.create({
			name: "Example User", email: "user-"+new Date().getTime()+"@example.com",
			password: "foobar", password_confirmation: "foobar"
		}).then(function(_user){
			Micropost.create({content: "Lorem ipsum test", user_id: _user.id}).then(function(micropost) {
				_user.addMicropost(micropost).then(function() {
					Micropost.count().then(function(c1) {
						_user.destroy().then(function(){
							Micropost.count().then(function(c2) {
								assert.equal(c1 - 1, c2);
								done();
							});
						});
					});
				});
			});
		});
	});

});
{% endhighlight %}

The test suite should still be successful

{% highlight bash %}
~/sample_app $ mocha test/models/*.js
  25 passing (2s)
{% endhighlight %}