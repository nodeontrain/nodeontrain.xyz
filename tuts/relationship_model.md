---
layout: tuts
title: The Relationship model
prev_section: micropost_images
next_section: web_interface
permalink: /tuts/relationship_model/
---

In this chapter, we will complete the sample application by adding a social layer that allows users to follow (and unfollow) other users, resulting in each user's Home page displaying a status feed of the followed users' microposts.

### The data model

As a first step toward constructing a data model for following users, let's examine a typical case. For instance, consider a user who follows a second user: we could say that, e.g., Calvin is following Hobbes, and Hobbes is followed by Calvin, so that Calvin is the follower and Hobbes is followed.

 We'll use the generic term relationship for the table name, with a corresponding Relationship model. To get started with the implementation, we first generate a migration
 
 {% highlight bash %}
~/sample_app $ trainjs generate model Relationship follower_id:integer followed_id:integer
{% endhighlight %}

Because we will be finding relationships by follower_id and by followed_id, we should add an index on each column for efficiency

`db/migrate/[timestamp]_create_relationships.js`

{% highlight javascript %}
module.exports = {
	up: function(migration, DataTypes, done) {
		// add altering commands here, calling 'done' when finished
		migration.createTable('relationship', {
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true
			},
			follower_id: {
				type: DataTypes.INTEGER,
				references: {
					model: 'user',
					key: 'id',
				}
			},
			followed_id: {
				type: DataTypes.INTEGER,
				references: {
					model: 'user',
					key: 'id',
				}
			},

			createdAt: DataTypes.DATE,
			updatedAt: DataTypes.DATE,
		});
		migration.addIndex('relationship', ['follower_id']);
		migration.addIndex('relationship', ['followed_id']);
		migration.addIndex('relationship', ['follower_id', 'followed_id'], {
			indicesType: 'UNIQUE'
		});
		done();
	},
	down: function(migration, DataTypes, done) {
		// add reverting commands here, calling 'done' when finished
		done();
	}
}
{% endhighlight %}

To create the relationships table, we migrate the database as usual

{% highlight bash %}
~/sample_app $ sequelize db:migrate
{% endhighlight %}


### User/relationship associations

Before implementing user following and followers, we first need to establish the association between users and relationships. A user has_many relationships, and—since relationships involve two users—a relationship belongs_to both a follower and a followed user.

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
			User.hasMany(models.Relationship, { as: 'active_relationships', foreignKey: 'follower_id', onDelete: 'cascade', hooks: true });
		}
	}
});

...
{% endhighlight %}

`app/models/relationship.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;

var Relationship = sequelize.define('relationship', {
	follower_id: {
		type: Sequelize.INTEGER,
	},
	followed_id: {
		type: Sequelize.INTEGER,
	},

}, {
	freezeTableName: true,
	classMethods: {
		associate: function(models) {
			Relationship.belongsTo(models.User, { as: 'follower', foreignKey: 'follower_id' });
			Relationship.belongsTo(models.User, { as: 'followed', foreignKey: 'followed_id' });
		}
	}
});

module.exports = Relationship;
{% endhighlight %}


### Relationship validations

Before moving on, we’ll add a couple of Relationship model validations for completeness.

`test/models/relationship_test.js`

{% highlight javascript %}
require('trainjs').initServer();
var assert = require('assert');

describe('RelationshipTest', function () {
	var relationship;

	beforeEach(function() {
		relationship = Relationship.build({follower_id: 1, followed_id: 2});
	});

	it('should be valid', function(done) {
		relationship.validate().then(function(errors){
			assert.equal(errors, undefined);
			done();
		});
	});

	it('should require a follower_id', function(done) {
		relationship.follower_id = null;
		relationship.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});

	it('should require a followed_id', function(done) {
		relationship.followed_id = null;
		relationship.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});
});
{% endhighlight %}

`app/models/relationship.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;

var Relationship = sequelize.define('relationship', {
	follower_id: {
		type: Sequelize.INTEGER,
		allowNull: false,
		validate: {
			notEmpty: true
		},
	},
	followed_id: {
		type: Sequelize.INTEGER,
		allowNull: false,
		validate: {
			notEmpty: true
		},
	},

}, {
	freezeTableName: true,
	classMethods: {
		associate: function(models) {
			Relationship.belongsTo(models.User, { as: 'follower', foreignKey: 'follower_id' });
			Relationship.belongsTo(models.User, { as: 'followed', foreignKey: 'followed_id' });
		}
	}
});

module.exports = Relationship;
{% endhighlight %}

The tests should be successful

{% highlight bash %}
~/sample_app $ mocha test/models/relationship_test.js
  RelationshipTest
    ✓ should be valid
    ✓ should require a follower_id
    ✓ should require a followed_id

  3 passing (24ms)
{% endhighlight %}

### Following and Followers

We come now to the heart of the Relationship associations: following and followers. Here we will use `through` for the first time: a user has many following through relationships

`app/models/user.js`

{% highlight javascript %}
...

var User = sequelize.define('user', {
	...
}, {
	freezeTableName: true,
	indexes: [{unique: true, fields: ['email']}],
	instanceMethods: {
		...
		follow: function(user) {
			return ModelSync(this.addFollowing(user));
		},
		unfollow: function(user) {
			return ModelSync(this.removeFollowing(user));
		},
		following: function(user) {
			return ModelSync(this.hasFollowing(user));
		}
	},
	classMethods: {
		...
		associate: function(models) {
			User.hasMany(models.Micropost, {
				foreignKey: 'user_id',
				onDelete: 'cascade',
				hooks: true
			});
			User.belongsToMany(User, {
				as: 'following',
				through: models.Relationship,
				foreignKey: 'follower_id',
				onDelete: 'cascade',
				hooks: true
			});
			User.belongsToMany(User, {
				as: 'followers',
				through: models.Relationship,
				foreignKey: 'followed_id',
				onDelete: 'cascade',
				hooks: true
			});
		}
	}
});

...
{% endhighlight %}

A test for following and followers

`test/models/user_test.js`

{% highlight javascript %}
require('trainjs').initServer();
var assert = require('assert');

describe('UserTest', function () {
	...

	it('should follow and unfollow a user', function(done) {
		var Fiber = require('fibers');
		Fiber(function() {
			var current_user = ModelSync( User.findOne({where: {id: 2}}) );
			var other_user = ModelSync( User.findOne({where: {id: 1}}) );
			assert.equal(current_user.following(other_user), false);
			current_user.follow(other_user);
			assert.equal(current_user.following(other_user), true);
			assert.equal(ModelSync(other_user.hasFollowers(current_user)), true);
			current_user.unfollow(other_user);
			assert.equal(current_user.following(other_user), false);
			done();
		}).run();
	});

});
{% endhighlight %}

At this point, the full test suite should be successful

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  21 passing (1s)
{% endhighlight %}