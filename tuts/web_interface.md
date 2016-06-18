---
layout: tuts
title: A web interface for following users
prev_section: relationship_model
next_section: status_feed
permalink: /tuts/web_interface/
---

["The Relationship model Section"](https://nodeontrain.xyz/tuts/relationship_model) placed rather heavy demands on our data modeling skills, and it's fine if it takes a while to soak in. In fact, one of the best ways to understand the associations is to use them in the web interface.

In the introduction to this chapter, we saw a preview of the page flow for user following. In this section, we will implement the basic interface and following/unfollowing functionality shown in those mockups. We will also make separate pages to show the user following and followers arrays.

### Sample following data

As in previous chapters, we will find it convenient to use the seed data Rake task to fill the database with sample relationships. This will allow us to design the look and feel of the web pages first, deferring the back-end functionality until later in this section.

`db/seeds.js`

{% highlight javascript %}
require('trainjs').initServer();
var faker = require('faker');

var time = 1;
function createUser(user1) {
	var name = faker.name.findName();
	var email = 'example-'+time+'@railstutorial.org';
	var password = 'password';
	User.create({
		name: name,
		email: email,
		password: password,
		password_confirmation: password,
		activated: true,
		activated_at: new Date().getTime()
	}).then(function(user_example) {
		if (time < 98) {
			if (time >= 1 && time <= 50)
				user1.setFollowing(user_example);
			if (time >= 2 && time <= 40)
				user_example.setFollowing(user1);

			if (time <= 4) {
				createMicroposts(user_example.id);
			}
			time++;
			createUser(user1);
		}
	});
}

function createMicroposts(user_id) {
	for (var i = 0; i < 50; i++) {
		var content = faker.lorem.sentence();
		Micropost.create({
			content: content,
			user_id: user_id
		}).then(function() {
		});
	}	
}

User.create({
	name:  "Example User",
	email: "example@railstutorial.org",
	password: "123456",
	password_confirmation: "123456",
	admin: true,
	activated: true,
	activated_at: new Date().getTime()
}).then(function(user1) {
	createMicroposts(user1.id);
	User.create({
		name:  "Example User",
		email: "user@example.com",
		password: "password",
		password_confirmation: "password",
		activated: true,
		activated_at: new Date().getTime()
	}).then(function(user2) {
		createMicroposts(user2.id);
		user1.setFollowing(user2);
		createUser(user1);
	});
});
{% endhighlight %}

{% highlight bash %}
~/sample_app $ rm -f db/development.sqlite3
~/sample_app $ sequelize db:migrate
~/sample_app $ node db/seeds.js
{% endhighlight %}

### Stats and a follow form