---
layout: tuts
title: Adding a secure password
prev_section: user_validations
next_section: showing_users
permalink: /tuts/secure_password/
---

Now that we’ve defined validations for the name and email fields, we’re ready to add the last of the basic User attributes: a secure password. The method is to require each user to have a password (with a password confirmation), and then store a hashed version of the password in the database.

### A hashed password

The secure password machinery will be implemented using a `beforeCreate`, `beforeUpdate` method and `bcrypt` module

`app/models/user.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;
var bcrypt = require('bcrypt');

var User = sequelize.define('user', {
	name: {
		type: Sequelize.STRING,
		allowNull: false,
		validate: {
			notEmpty: true,
			len: [1,50]
		}
	},
	email: {
		type: Sequelize.STRING,
		allowNull: false,
		validate: {
			isEmail: true,
			notEmpty: true,
			len: [1,255]
		}
	},
	password_digest: {
		type: Sequelize.STRING,
		validate: {
			notEmpty: true
		}
	},
	password: {
		type: Sequelize.VIRTUAL,
		allowNull: false,
		validate: {
			notEmpty: true
		}
	},
	password_confirmation: {
		type: Sequelize.VIRTUAL
	}
}, {
	freezeTableName: true,
	indexes: [{unique: true, fields: ['email']}],
	instanceMethods: {
		authenticate: function(value) {
			if (bcrypt.compareSync(value, this.password_digest))
				return this;
			else
				return false;
		}
	}
});

var hasSecurePassword = function(user, options, callback) {
	bcrypt.hash(user.get('password'), 10, function(err, hash) {
		if (err) return callback(err);
		user.set('password_digest', hash);
		return callback(null, options);
	});
};

User.beforeCreate(function(user, options, callback) {
	if (user.password != user.password_confirmation) {
		throw new Error("Password confirmation doesn't match Password");
	}
	user.email = user.email.toLowerCase();
	hasSecurePassword(user, options, callback);
})
User.beforeUpdate(function(user, options, callback) {
	user.email = user.email.toLowerCase();
	hasSecurePassword(user, options, callback);
})

module.exports = User;
{% endhighlight %}

To implement the data model, we first generate an appropriate migration for the `password_digest` column.

{% highlight bash %}
~/sample_app $ sequelize migration:create --name add_password_digest_to_users
Loaded configuration file "config/database.json".
Using environment "development".
Using gulpfile /usr/lib/node_modules/sequelize-cli/lib/gulpfile.js
Successfully created migrations folder at "/home/train/projects/node_projects/workspace/sample_app/db/migrate".
New migration was created at /home/train/projects/node_projects/workspace/sample_app/db/migrate/20160128145145-add_password_digest_to_users.js .
Finished 'migration:create' after 29 ms
{% endhighlight %}

We use the `addColumn` method to add a `password_digest` column to the `user` table.

`db/migrate/[timestamp]-add_password_to_users.js`

{% highlight javascript %}
'use strict';

module.exports = {
	up: function (queryInterface, Sequelize) {
		queryInterface.addColumn(
			'user',
			'password_digest',
			Sequelize.STRING
		)
	},

	down: function (queryInterface, Sequelize) {

	}
};
{% endhighlight %}

To apply it, we just migrate the database

{% highlight bash %}
~/sample_app $ sequelize db:migrate
Loaded configuration file "config/database.json".
Using environment "development".
Using gulpfile /usr/lib/node_modules/sequelize-cli/lib/gulpfile.js
Starting 'db:migrate'...
Finished 'db:migrate' after 647 ms
== 20160128145145-add_password_digest_to_users: migrating =======
== 20160128145145-add_password_digest_to_users: migrated (0.643s)
{% endhighlight %}

To make the password digest, we use a state-of-the-art hash function called `bcrypt`
{% highlight bash %}
~/sample_app $ npm install bcrypt --save
{% endhighlight %}


### User has secure password

The tests are now failing, as you can confirm at the command line

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  UserTest
Unhandled rejection AssertionError: { [SequelizeValidationError: notNull Violation: password cannot be null]
...
{% endhighlight %}

To get the test suite passing again, we just need to add a password and its confirmation

`test/models/user_test.js`

{% highlight javascript %}
require('trainjs').initServer();
var assert = require('assert');

describe('UserTest', function () {
	var user;

	beforeEach(function() {
		user = User.build({
			name: "Example User", email: "user@example.com",
			password: "foobar", password_confirmation: "foobar"
		});
	});

	...
});
{% endhighlight %}

Now the tests should be successful

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  UserTest
	✓ should be valid
	✓ name should be present
	✓ email should be present
	...

  16 passing (352ms)
{% endhighlight %}

### Minimum password standards

It’s good practice in general to enforce some minimum standards on passwords to make them harder to guess. Picking a length of 6 as a reasonable minimum leads to the validation test

`test/models/user_test.js`

{% highlight javascript %}
require('trainjs').initServer();
var assert = require('assert');

describe('UserTest', function () {
	var user;

	beforeEach(function() {
		user = User.build({
			name: "Example User", email: "user@example.com",
			password: "foobar", password_confirmation: "foobar"
		});
	});

	...

	it('password should be present (nonblank)', function(done) {
		user.password = user.password_confirmation = " ".repeat(6);
		user.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});

	it('password should have a minimum length', function(done) {
		user.password = user.password_confirmation = " ".repeat(5);
		user.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});

});
{% endhighlight %}

You may be able to guess the code for enforcing a minimum length constraint by referring to the corresponding maximum validation

`app/models/user.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;
var bcrypt = require('bcrypt');

var User = sequelize.define('user', {
	...
	password: {
		type: Sequelize.VIRTUAL,
		allowNull: false,
		validate: {
			notEmpty: true,
			len: [6, Infinity]
		}
	},
	password_confirmation: {
		type: Sequelize.VIRTUAL
	}
}, {
	freezeTableName: true,
	indexes: [{unique: true, fields: ['email']}],
	instanceMethods: {
		authenticate: function(value) {
			if (bcrypt.compareSync(value, this.password_digest))
				return this;
			else
				return false;
		}
	}
});

...
{% endhighlight %}

At this point, the tests should be successful

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  UserTest
	✓ should be valid
	✓ name should be present
	✓ email should be present
	...

  18 passing (260ms)
{% endhighlight %}


### Creating and authenticating a user

Now that the basic User model is complete, we’ll create a user in the database

{% highlight javascript %}
> require('trainjs').initServer()
> User.create({name: "Dang Thanh", email: "thanh@example.com", password: "foobar", password_confirmation: "foobar"})
Executing (default): INSERT INTO `user` (`id`,`name`,`email`,`password_digest`,`updatedAt`,`createdAt`) VALUES (NULL,'Dang Thanh','thanh@example.com','$2a$10$7gVwYayQoKFSEkJfobhAne4EjC52Djt7x1cl9cponFtAn.zVtfP0e','2016-01-29 05:30:00.511 +00:00','2016-01-29 05:30:00.511 +00:00');
> var user;
> User.findOne({ where: { email: "thanh@example.com" } }).then(function(data) { user = data })
> user.password_digest
'$2a$10$7gVwYayQoKFSEkJfobhAne4EjC52Djt7x1cl9cponFtAn.zVtfP0e'
{% endhighlight %}

The `authenticate` method in model determines if a given password is valid for a particular user by computing its digest and comparing the result to password_digest in the database. In the case of the user we just created, we can try a couple of invalid passwords as follows:
{% highlight javascript %}
> user.authenticate('not_the_right_password')
false
> user.authenticate('foobaz')
false
{% endhighlight %}

Here user.authenticate returns false for invalid password. If we instead authenticate with the correct password, authenticate returns the user itself

{% highlight javascript %}
> user.authenticate('foobar')
{ dataValues:
   { id: 1,
	 name: 'Dang Thanh',
	 email: 'thanh@example.com',
	 password_digest: '$2a$10$7gVwYayQoKFSEkJfobhAne4EjC52Djt7x1cl9cponFtAn.zVtfP0e',
	 createdAt: Fri Jan 29 2016 12:30:00 GMT+0700 (ICT),
	 updatedAt: Fri Jan 29 2016 12:30:00 GMT+0700 (ICT) },
	 ...
{% endhighlight %}

