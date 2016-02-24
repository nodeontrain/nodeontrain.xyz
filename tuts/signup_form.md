---
layout: tuts
title: Signup form
prev_section: showing_users
next_section: unsuccessful_signups
permalink: /tuts/signup_form/
---

Now that we have a working (though not yet complete) user profile page, we’re ready to make a signup form for our site.
Since we’re about to add the ability to create new users through the web, let’s remove the user created at the console

{% highlight bash %}
~/sample_app $ rm -f db/development.sqlite3
~/sample_app $ sequelize db:migrate
Loaded configuration file "config/database.json".
Using environment "development".
Using gulpfile /usr/lib/node_modules/sequelize-cli/lib/gulpfile.js
Starting 'db:migrate'...
Finished 'db:migrate' after 912 ms
== 20160119110300_create_users: migrating =======
== 20160119110300_create_users: migrated (0.632s)

== 20160126154757-add_index_to_users_email: migrating =======
== 20160126154757-add_index_to_users_email: migrated (0.306s)

== 20160128145145-add_password_digest_to_users: migrating =======
== 20160128145145-add_password_digest_to_users: migrated (0.286s)
{% endhighlight %}

### Using form_for

The heart of the signup page is a form for submitting the relevant signup information (name, email, password, confirmation).

{% highlight bash %}
~/sample_app $ npm install angular-form-for --save
{% endhighlight %}

`public/index.html`

{% highlight html %}
...
<script src="../node_modules/angular-md5/angular-md5.min.js"></script>
<script src="../node_modules/angular-form-for/dist/form-for.min.js"></script>
<script src="../node_modules/angular-form-for/dist/form-for.bootstrap-templates.js"></script>
...
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
...
var sampleApp = angular.module('sampleApp', [
	'ui.router',
	'userService',
	'usersController',
	'staticPagesController',
	'bodyDirective',
	'headDirective',
	'gravatarForDirective',
	'formFor',
	'formFor.bootstrapTemplates'
]);
...
{% endhighlight %}

Recalling that the signup page /signup is routed to the `new` action in the Users controller, our first step is to create the User object required as an argument to `form_for`.

`public/controllers/users_controller.js`

{% highlight javascript %}
...
usersController.controller(
	'UsersNewCtrl',
	['$scope', function ($scope) {
		$scope.user = {name: '', email: '', password: '', password_confirmation: ''};
		$scope.saveUser = function() {

		};
	}]
);
...
{% endhighlight %}

`public/partials/users/new.html`

{% highlight html %}
<h1>Sign up</h1>

<div class="row">
	<div class="col-md-6 col-md-offset-3">
		<form form-for="user" submit-with="saveUser()">
			<text-field attribute="name" label="Name" type="text"></text-field>
			<text-field attribute="email" label="Email" type="email"></text-field>
			<text-field attribute="password" label="Password" type="password"></text-field>
			<text-field attribute="password_confirmation" label="Password Confirmation" type="password"></text-field>
			<input class="btn btn-primary" name="commit" type="submit" value="Create my account" />
		</form>
	</div>
</div>
{% endhighlight %}


`public/assets/stylesheets/custom.css`

{% highlight css %}
...
/* forms */

input, textarea, select, .uneditable-input {
  border: 1px solid #bbb;
  width: 100%;
  margin-bottom: 15px;
  -moz-box-sizing: border-box;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
}

input {
  height: auto !important;
}
{% endhighlight %}

<img src="/img/tuts/signup_form1.png" alt="signup form 1" width="100%" />

