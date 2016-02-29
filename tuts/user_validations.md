---
layout: tuts
title: User validations
prev_section: user_model
next_section: secure_password
permalink: /tuts/user_validations/
---

The User model we created now has working name and email attributes, but they are completely generic: any string (including an empty one) is currently valid in either case. And yet, names and email addresses are more specific than this. For example, name should be non-blank, and email should match the specific format characteristic of email addresses.

In short, we shouldn’t allow name and email to be just any strings; we should enforce certain constraints on their values.

### A validity test

To get us started, the `generate model` command produced an initial test for testing users, though in this case it’s practically blank

{% highlight javascript %}
require('trainjs').initServer();

describe('UserTest', function () {

});
{% endhighlight %}

To test the model we use `mocha` framework

{% highlight bash %}
~/sample_app $ sudo npm install -g mocha
{% endhighlight %}

To write a test for a valid object, we’ll create an initially valid User model object `user` using the special `beforeEach` method, which automatically gets run before each test. Because `user` is an instance variable, it’s automatically available in all the tests, and we can test its validity using the validate() method

`test/models/user_test.js`

{% highlight javascript %}
require('trainjs').initServer();
var assert = require('assert');

describe('UserTest', function () {
	var user;

	beforeEach(function() {
		user = User.build({name: "Example User", email: "user@example.com"});
	});

	it('should be valid', function(done) {
		user.validate().then(function(errors){
			assert.equal(errors, undefined);
			done();
		});
	});
});
{% endhighlight %}

Because our User model doesn’t currently have any validations, the initial test should pass

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  UserTest
	✓ should be valid

  1 passing (28ms)
{% endhighlight %}

### Validating presence

We’ll start with a test for the presence of a name attribute
`test/models/user_test.js`
{% highlight javascript %}
require('trainjs').initServer();
var assert = require('assert');

describe('UserTest', function () {
	var user;

	beforeEach(function() {
		user = User.build({name: "Example User", email: "user@example.com"});
	});

	it('should be valid', function(done) {
		user.validate().then(function(errors){
			assert.equal(errors, undefined);
			done();
		});
	});

	it('name should be present', function(done) {
		user.name = "     ";
		user.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});
});
{% endhighlight %}

At this point, the model tests should be failing

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  UserTest
	✓ should be valid
Unhandled rejection AssertionError: undefined != undefined
...
	1) name should be present

  1 passing (2s)
  1 failing
{% endhighlight %}

The way to validate the presence of the name attribute is to use the `validate` param with argument `notEmpty: true`

`app/models/user.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;

var User = sequelize.define('user', {
	name: {
		type: Sequelize.STRING,
		allowNull: false,
		validate: {
			notEmpty: true
		}
	},
	email: {
		type: Sequelize.STRING,
	},

}, {
	freezeTableName: true // Model tableName will be the same as the model name
});

module.exports = User;
{% endhighlight %}

Let’s drop into the console to see the effects of adding a validation to our User model

{% highlight bash %}
~/sample_app $ node
{% endhighlight %}

Here we check the validity of the user variable using the `validate` method

{% highlight javascript %}
> require('trainjs').initServer()
> var user = User.build({name: "", email: "mhartl@example.com"})
> user.validate().then(function(errors) { console.log(errors) })
 { [SequelizeValidationError: Validation error: Validation notEmpty failed]
  name: 'SequelizeValidationError',
  message: 'Validation error: Validation notEmpty failed',
  errors:
   [ { message: 'Validation notEmpty failed',
	   type: 'Validation error',
	   path: 'name',
	   value: 'Validation notEmpty failed',
	   __raw: 'Validation notEmpty failed' } ] }
{% endhighlight %}

Because the user isn’t valid, an attempt to save the user to the database automatically fails
{% highlight javascript %}
> user.save()
Unhandled rejection SequelizeValidationError: Validation error: Validation notEmpty failed
{% endhighlight %}

As a result, the test should now be successful

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  UserTest
	✓ should be valid
	✓ name should be present

  2 passing (30ms)
{% endhighlight %}

Following this test, writing a test for email attribute presence is easy, as is the application code to get it to pass

`test/models/user_test.js`

{% highlight javascript %}
require('trainjs').initServer();
var assert = require('assert');

describe('UserTest', function () {
	var user;

	beforeEach(function() {
		user = User.build({name: "Example User", email: "user@example.com"});
	});

	it('should be valid', function(done) {
		user.validate().then(function(errors){
			assert.equal(errors, undefined);
			done();
		});
	});

	it('name should be present', function(done) {
		user.name = "     ";
		user.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});

	it('email should be present', function(done) {
		user.email = "     ";
		user.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});
});
{% endhighlight %}

`app/models/user.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;

var User = sequelize.define('user', {
	name: {
		type: Sequelize.STRING,
		allowNull: false,
		validate: {
			notEmpty: true
		}
	},
	email: {
		type: Sequelize.STRING,
		allowNull: false,
		validate: {
			notEmpty: true
		}
	},

}, {
	freezeTableName: true // Model tableName will be the same as the model name
});

module.exports = User;
{% endhighlight %}

At this point, the presence validations are complete, and the test suite should be successful

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  UserTest
	✓ should be valid
	✓ name should be present
	✓ email should be present

  3 passing (31ms)
{% endhighlight %}


### Length validation

We’ve constrained our User model to require a name for each user, but we should go further: the user’s names will be displayed on the sample site, so we should enforce some limit on their length.

`test/models/user_test.js`

{% highlight javascript %}
require('trainjs').initServer();
var assert = require('assert');

describe('UserTest', function () {
	var user;

	beforeEach(function() {
		user = User.build({name: "Example User", email: "user@example.com"});
	});

	...

	it('name should not be too long', function(done) {
		user.name = "a".repeat(51);
		user.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});

	it('email should not be too long', function(done) {
		user.email = "a".repeat(244) + "@example.com";
		user.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});
});
{% endhighlight %}

We can see how this works using the console

{% highlight javascript %}
> "a".repeat(51)
'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
> "a".repeat(51).length
51
{% endhighlight %}

The email length validation arranges to make a valid email address that’s one character too long

{% highlight javascript %}
> "a".repeat(244) + "@example.com"
'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@example.com'
> ("a".repeat(244) + "@example.com").length
256
{% endhighlight %}

At this point, the tests should be failing

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  UserTest
	✓ should be valid
	✓ name should be present
	✓ email should be present
Unhandled rejection AssertionError: undefined != undefined

  3 passing (4s)
  2 failing
{% endhighlight %}

To get them to pass, we need to use the validation argument to constrain length

`app/models/user.js`

{% highlight javascript %}
...
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
		notEmpty: true,
		len: [1,255]
	}
},
...
{% endhighlight %}

Now the tests should be successful

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  UserTest
	✓ should be valid
	✓ name should be present
	✓ email should be present
	✓ name should not be too long
	✓ email should not be too long

  5 passing (36ms)
{% endhighlight %}

### Format validation

Our validations for the `name` attribute enforce only minimal constraints—any non-blank name under 51 characters will do—but of course the `email` attribute must satisfy the more stringent requirement of being a valid email address.

`test/models/user_test.js`

{% highlight javascript %}
...
var valid_addresses = ["user@example.com", "USER@foo.COM", "A_US-ER@foo.bar.org", "first.last@foo.jp", "alice+bob@baz.cn"];
valid_addresses.forEach(function(valid_address) {
	it('email validation should accept valid addresses: ' + valid_address, function(done) {
		user.email = valid_address;
		user.validate().then(function(errors){
			assert.equal(errors, undefined, "'" + valid_address + "' should be valid");
			done();
		});
	});
});
...
{% endhighlight %}

Next we’ll add tests for the invalidity of a variety of invalid email addresses.

{% highlight javascript %}
...
var invalid_addresses = ["user@example,com", "user_at_foo.org", "user.name@example.", "foo@bar_baz.com",  "foo@bar+baz.com"];
invalid_addresses.forEach(function(invalid_address) {
	it('email validation should reject invalid address: ' + invalid_address, function(done) {
		user.email = invalid_address;
		user.validate().then(function(errors){
			assert.notEqual(errors, undefined);
			done();
		});
	});
});
...
{% endhighlight %}

At this point, the tests should be failing

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  UserTest
	✓ should be valid
	✓ name should be present
	✓ email should be present
	✓ name should not be too long
	✓ email should not be too long
	✓ email validation should accept valid address: user@example.com
	✓ email validation should accept valid address: USER@foo.COM
	✓ email validation should accept valid address: A_US-ER@foo.bar.org
	✓ email validation should accept valid address: first.last@foo.jp
	✓ email validation should accept valid address: alice+bob@baz.cn
Unhandled rejection AssertionError: undefined != undefined

  10 passing (10s)
  5 failing
{% endhighlight %}

The application code for email format validation uses the `isEmail` validation

`app/models/user.js`

{% highlight javascript %}
...
email: {
	type: Sequelize.STRING,
	allowNull: false,
	validate: {
		isEmail: true,
		notEmpty: true,
		len: [1,255]
	}
},
...
{% endhighlight %}

At this point, the tests should be successful

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  UserTest
	✓ should be valid (39ms)
	✓ name should be present
	✓ email should be present
	✓ name should not be too long
	✓ email should not be too long
	✓ email validation should accept valid address: user@example.com
	✓ email validation should accept valid address: USER@foo.COM
	✓ email validation should accept valid address: A_US-ER@foo.bar.org
	✓ email validation should accept valid address: first.last@foo.jp
	✓ email validation should accept valid address: alice+bob@baz.cn
	✓ email validation should reject invalid address: user@example,com
	✓ email validation should reject invalid address: user_at_foo.org
	✓ email validation should reject invalid address: user.name@example.
	✓ email validation should reject invalid address: foo@bar_baz.com
	✓ email validation should reject invalid address: foo@bar+baz.com

  15 passing (94ms)
{% endhighlight %}

### Uniqueness validation

To enforce uniqueness of email addresses (so that we can use them as usernames), we’ll be using the `unique` option.

We’ll start with some short tests.

`test/models/user_test.js`

{% highlight javascript %}
...
it('email addresses should be unique', function(done) {
	var duplicate_user = user;
	user.save().then(function(){
		duplicate_user.save().then(function(){
			done();
		}).catch(function(errors) {
			assert.notEqual(errors, undefined);
		});
	}).catch(function(error) {
		done();
	});
});
...
{% endhighlight %}

We can get the new test to pass by adding `unique: true` to the `indexes` option

`app/models/user.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;

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

}, {
	freezeTableName: true,
	indexes: [{unique: true, fields: ['email']}]
});

module.exports = User;
{% endhighlight %}

At this point, our application—with an important caveat—enforces email uniqueness, and our test suite should pass

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  UserTest
	✓ should be valid (39ms)
	✓ name should be present
	✓ email should be present
	✓ name should not be too long
	✓ email should not be too long
	....

	✓ email addresses should be unique (239ms)

  16 passing (365ms)
{% endhighlight %}

There’s just one small problem, which is that the uniqueness validation does not guarantee uniqueness at the database level. Here’s a scenario that explains why:

1. Alice signs up for the sample app, with address alice@wonderland.com.
2. Alice accidentally clicks on “Submit” twice, sending two requests in quick succession.
3. The following sequence occurs: request 1 creates a user in memory that passes validation, request 2 does the same, request 1’s user gets saved, request 2’s user gets saved.
4. Result: two user records with the exact same email address, despite the uniqueness validation

Luckily, the solution is straightforward to implement: we just need to enforce uniqueness at the database level as well as at the model level. Our method is to create a database index on the email column, and then require that the index be unique.

We are adding structure to an existing model, so we need to create a migration directly using the migration generator
{% highlight bash %}
~/sample_app $ sequelize migration:create --name add_index_to_users_email
Loaded configuration file "config/database.json".
Using environment "development".
Using gulpfile /usr/lib/node_modules/sequelize-cli/lib/gulpfile.js
Starting 'migration:create'...
Successfully created migrations folder at "/home/train/projects/node_projects/workspace/sample_app/db/migrate".
New migration was created at /home/train/projects/node_projects/workspace/sample_app/db/migrate/20160126154757-add_index_to_users_email.js .
{% endhighlight %}

Unlike the migration for users, the email uniqueness migration is not pre-defined, so we need to fill in its contents

`db/migrate/[timestamp]-add_index_to_users_email.js`

{% highlight javascript %}
'use strict';

module.exports = {
	up: function (queryInterface, Sequelize) {
		queryInterface.addIndex('user', ['email'], {
			indicesType: 'UNIQUE'
		});
	},

	down: function (queryInterface, Sequelize) {

	}
};
{% endhighlight %}

The final step is to migrate the database

{% highlight bash %}
~/sample_app $ sequelize db:migrate
Loaded configuration file "config/database.json".
Using environment "development".
Using gulpfile /usr/lib/node_modules/sequelize-cli/lib/gulpfile.js
Starting 'db:migrate'...
Finished 'db:migrate' after 947 ms
== 20160126154757-add_index_to_users_email: migrating =======
== 20160126154757-add_index_to_users_email: migrated (0.277s)
{% endhighlight %}

Having addressed the uniqueness caveat, there’s one more change we need to make to be assured of email uniqueness. Some database adapters use case-sensitive indices, considering the strings “Foo@ExAMPle.CoM” and “foo@example.com” to be distinct, but our application treats those addresses as the same. To avoid this incompatibility, we’ll standardize on all lower-case addresses, converting “Foo@ExAMPle.CoM” to “foo@example.com” before saving it to the database.

We’ll use `beforeCreate` and `beforeUpdate` to downcase the email attribute before saving the user.

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;

var User = sequelize.define('user', {
	...
}, {
	freezeTableName: true,
	indexes: [{unique: true, fields: ['email']}]
});

User.beforeCreate(function(user, options) {
	user.email = user.email.toLowerCase();
})
User.beforeUpdate(function(user, options) {
	user.email = user.email.toLowerCase();
})

module.exports = User;
{% endhighlight %}
