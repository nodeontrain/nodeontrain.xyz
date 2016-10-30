---
layout: tuts
title: User model
prev_section: user_signup_first_step
next_section: user_validations
permalink: /tuts/user_model/
---

Although the ultimate goal of [the previous post](https://nodeontrain.xyz/tuts/user_signup_first_step/) is to make a signup page for our site, it would do little good now to accept information for new users: we don't currently have any place to put it. Thus, the first step in signing up users is to make a data structure to capture and store their information.

### Database migrations

The analogous command for making a model is `generate model`, which we can use to generate a User model with `name` and `email` attributes.

{% highlight bash %}
~/sample_app $ trainjs generate database sqlite
      create  .sequelizerc
      create  config/database.json
{% endhighlight %}

{% highlight bash %}
~/sample_app $ trainjs generate model User name:string email:string
	identical  .sequelizerc
	   create  app/models/user.js
	   create  config/database.json
	   create  db
	   create  db/migrate
	   create  db/migrate/20160119110300_create_users.js
	   create  test/models/user_test.js
{% endhighlight %}

Install all modules listed as dependencies in `package.json`

{% highlight bash %}
~/sample_app $ npm install
{% endhighlight %}

One of the results of the generate command is a new file called a migration. Migrations provide a way to alter the structure of the database incrementally, so that our data model can adapt to changing requirements. In the case of the User model, the migration is created automatically by the model generation script; it creates a `user` table with two columns, `name` and `email`

`db/migrate/[timestamp]_create_users.js`

{% highlight javascript %}
module.exports = {
	up: function(migration, DataTypes, done) {
		// add altering commands here, calling 'done' when finished
		migration.createTable('user', {
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true
			},
			name: DataTypes.STRING,
			email: DataTypes.STRING,

			createdAt: DataTypes.DATE,
			updatedAt: DataTypes.DATE,
		});
		done();
	},
	down: function(migration, DataTypes, done) {
		// add reverting commands here, calling 'done' when finished
		done();
	}
}
{% endhighlight %}

Note that the name of the migration file is prefixed by a timestamp based on when the migration was generated. We can run the migration, known as `migrating up`, using the `sequelize` command

{% highlight bash %}
~/sample_app $ sequelize db:migrate
Loaded configuration file "config/database.json".
Using environment "development".
Using gulpfile /usr/lib/node_modules/sequelize-cli/lib/gulpfile.js
Starting 'db:migrate'...
Finished 'db:migrate' after 411 ms
== 20160119110300_create_users: migrating =======
== 20160119110300_create_users: migrated (0.272s)
{% endhighlight %}

### Creating user objects

Using `node` console to explore data models.
{% highlight bash %}
~/sample_app $ node
{% endhighlight %}

Load config file and models file
{% highlight javascript %}
> require('trainjs').initServer()
{% endhighlight %}

In the console session, we created a new user object with User.build
{% highlight javascript %}
> User.build()
{% endhighlight %}

When called with no arguments, `User.build` returns an object with all NULL attributes. Now we created a user with name and email attributes.
{% highlight javascript %}
> var user = User.build({name: "Dang Thanh", email: "thanh@example.com"})
undefined
> user
{ dataValues: { id: null, name: 'Dang Thanh', email: 'thanh@example.com' },
...
{% endhighlight %}

`User.build` only creates an unsaved object. In order to save the User object to the database, we need to call the save method on the user variable.
{% highlight javascript %}
> user.save()
Executing (default): INSERT INTO `user` (`id`,`name`,`email`,`updatedAt`,`createdAt`) VALUES (NULL,'Dang Thanh','thanh@example.com','2016-01-20 09:39:59.293 +00:00','2016-01-20 09:39:59.293 +00:00');
{% endhighlight %}

You may have noticed that the new user object had `null` values for the `id` and the magic columns `createdAt` and `updatedAt` attributes. Let's see if our save changed anything
{% highlight javascript %}
> user
{ dataValues:
   { id: 1,
	 name: 'Dang Thanh',
	 email: 'thanh@example.com',
	 updatedAt: Wed Jan 20 2016 16:39:59 GMT+0700 (ICT),
	 createdAt: Wed Jan 20 2016 16:39:59 GMT+0700 (ICT) },
	 ...
{% endhighlight %}

We see that the id has been assigned a value of 1, while the magic columns have been assigned the current time and date.
As with the User class, instances of the User model allow access to their attributes using a dot notation
{% highlight javascript %}
> user.name
'Dang Thanh'
> user.email
'thanh@example.com'
> user.updatedAt
Wed Jan 20 2016 16:39:59 GMT+0700 (ICT)
{% endhighlight %}

We can create an user into one step with `User.create`
{% highlight javascript %}
> User.create({name: "A Nother", email: "another@example.org"})
Executing (default): INSERT INTO `user` (`id`,`name`,`email`,`updatedAt`,`createdAt`) VALUES (NULL,'A Nother','another@example.org','2016-01-20 09:50:40.137 +00:00','2016-01-20 09:50:40.137 +00:00');
> var foo
undefined
> User.create({name: "Foo", email: "foo@bar.com"}).then(function(data){ foo = data })
Executing (default): INSERT INTO `user` (`id`,`name`,`email`,`updatedAt`,`createdAt`) VALUES (NULL,'Foo','foo@bar.com','2016-01-20 09:53:15.966 +00:00','2016-01-20 09:53:15.966 +00:00');
{% endhighlight %}

The inverse of create is destroy
{% highlight javascript %}
> foo.destroy()
Executing (default): DELETE FROM `user` WHERE `id` = 3
{% endhighlight %}


### Finding user objects
Sequelize provides several options for finding objects. Let's use them to find the first user we created while verifying that the third user (foo) has been destroyed. We'll start with the existing user
{% highlight javascript %}
> User.findById(1).then(function(data){ console.log(data) })
{ dataValues:
   { id: 1,
	 name: 'Dang Thanh',
	 email: 'thanh@example.com',
	 createdAt: Wed Jan 20 2016 16:39:59 GMT+0700 (ICT),
	 updatedAt: Wed Jan 20 2016 16:39:59 GMT+0700 (ICT) },
	 ...
{% endhighlight %}

Here we've passed the id of the user to User.find; Sequelize returns the user with that id.

Let's see if the user with an id of 3 still exists in the database
{% highlight javascript %}
> User.findById(3).then(function(data){ console.log(data) })
null
{% endhighlight %}

Since we destroyed our third user, Sequelize can't find it in the database.

Sequelize also allows us to find users by specific attributes
{% highlight javascript %}
> User.findOne( { where: {email: "thanh@example.com"} } ).then(function(data){ console.log(data) })
{ dataValues:
   { id: 1,
	 name: 'Dang Thanh',
	 email: 'thanh@example.com',
	 createdAt: Wed Jan 20 2016 16:39:59 GMT+0700 (ICT),
	 updatedAt: Wed Jan 20 2016 16:39:59 GMT+0700 (ICT) },
	   ...
{% endhighlight %}

### Updating user objects

Once we've created objects, we often want to update them. There are two basic ways to do this. First, we can assign attributes individually
{% highlight javascript %}
> user
{ dataValues:
   { id: 1,
	 name: 'Dang Thanh',
	 email: 'thanh@example.com',
	 createdAt: Wed Jan 20 2016 16:39:59 GMT+0700 (ICT),
	 updatedAt: Wed Jan 20 2016 16:39:59 GMT+0700 (ICT) },
	   ...
> user.email = "thanh@example.net"
'thanh@example.net'
> user.save()
Executing (default): UPDATE `user` SET `email`='thanh@example.net',`updatedAt`='2016-01-20 15:34:28.479 +00:00' WHERE `id` = 1
{% endhighlight %}

The second main way to update multiple attributes is to use `update`
{% highlight javascript %}
> user.update({name: "The Dude", email: "dude@abides.org"})
Executing (default): UPDATE `user` SET `name`='The Dude',`email`='dude@abides.org',`updatedAt`='2016-01-20 15:36:21.866 +00:00' WHERE `id` = 1
> user.name
'The Dude'
> user.email
'dude@abides.org'
{% endhighlight %}
