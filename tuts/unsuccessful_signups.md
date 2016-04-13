---
layout: tuts
title: Unsuccessful signups
prev_section: signup_form
next_section: successful_signups
permalink: /tuts/unsuccessful_signups/
---

In this section, we'll create a signup form that accepts an invalid submission and re-renders the signup page with a list of errors.

### A working form

Recall from ["Showing users" Section](https://nodeontrain.xyz/tuts/showing_users/) that adding `resources: 'users'` to the `config/routes.js` file automatically ensures that our application responds to the RESTful URLs. In particular, it ensures that a POST request to /users is handled by the create action.

`public/controllers/users_controller.js`

{% highlight javascript %}
...
usersController.controller(
	'UsersNewCtrl',
	['$scope', 'User', '$q', function ($scope, User, $q) {
		$scope.user = {name: '', email: '', password: '', password_confirmation: ''};
		$scope.validation_rules = {
			name: {
				required: true,
				maxlength: 50
			},
			email: {
				required: true,
				maxlength: 255
			},
			password: {
				required: true,
				minlength: 6
			},
			password_confirmation: {
				custom: function(value, model) {
					var deferred = $q.defer();
					if (model.password != model.password_confirmation) {
						deferred.reject("Password confirmation doesn't match Password");
					} else {
						deferred.resolve();
					}
					return deferred.promise;
				}
			}
		};
		$scope.saveUser = function() {
			User.create($scope.user, function(user){
				if ( user.errors ) {
					$scope.error_messages = user.errors;
				} else {
					// Handle a successful save.
				}
			});
		};
	}]
);
...
{% endhighlight %}

`public/services/user.js`

{% highlight javascript %}
var userService = angular.module('userService', ['ngResource']);

userService.factory('User', ['$resource', function($resource){
	return $resource('users/:id', {id:'@id'}, {
		'get':    {method: 'GET'},
		'create': {method:'POST'},
	});
}]);
{% endhighlight %}

`app/controllers/users_controller.js`

{% highlight javascript %}
function UsersController() {
	this.show = function(req, res, next) {
		var user = ModelSync( User.findById(req.params.id) );
		res.end(JSON.stringify(user));
	};

	this.create = function(req, res, next) {
		var user = ModelSync( User.create(req.body) );
		res.end(JSON.stringify(user));
	};
};

module.exports = UsersController;
{% endhighlight %}

We use the `bodyParser` object to create middlewares. The `req.body` property return the parsed body, or an empty object ({}) if there was no body to parse.

{% highlight bash %}
~/sample_app $ npm install body-parser --save
{% endhighlight %}

`app.js`

{% highlight javascript %}
var connect = require('connect');
var bodyParser = require('body-parser');

var app = connect();
app.use(bodyParser.json());

module.exports = app;
{% endhighlight %}

### Signup error messages

As a final step in handling failed user creation, we'll add helpful error messages to indicate the problems that prevented successful signup.

{% highlight javascript %}
> require('trainjs').initServer()
> var user = User.build({name: "Foo Bar", email: "foo@invalid",password: "dude", password_confirmation: "dude"})
> user.save()
Unhandled rejection SequelizeValidationError: Validation error: Validation isEmail failed,
Validation error: Validation len failed
{% endhighlight %}

As in the console session above, the failed save generates a list of error messages associated with the `user` object. To display the messages in the browser, we'll render an error-messages partial on the user new page

`public/partials/users/new.html`

{% highlight html %}
<h1>Sign up</h1>

<div class="row">
	<div class="col-md-6 col-md-offset-3">
		<form form-for="user" submit-with="saveUser()" validation-rules="validation_rules">
			<div error-messages ng-if="error_messages" id="error_explanation"></div>
			<text-field required attribute="name" label="Name" type="text"></text-field>
			<text-field attribute="email" label="Email" type="email"></text-field>
			<text-field attribute="password" label="Password" type="password"></text-field>
			<text-field attribute="password_confirmation" label="Password Confirmation" type="password"></text-field>
			<input class="btn btn-primary" name="commit" type="submit" value="Create my account" />
		</form>
	</div>
</div>
{% endhighlight %}

We then need to create the `messageDirective` directive

`public/directives/message.js`

{% highlight javascript %}
var messageDirective = angular.module('messageDirective', []);

messageDirective.directive('errorMessages', function() {
	return {
		restrict: 'A',
		link: function(scope, elem, attrs) {
			var mess_div = angular.element('<div/>');
			mess_div.attr('class', 'alert alert-danger');
			mess_div.text('The form contains ' + pluralize('error', scope.error_messages.length, true) );

			var mess_ul = angular.element('<ul/>');
			for (var i in scope.error_messages) {
				var msg = scope.error_messages[i].message;
				var mess_li = angular.element('<li/>');
				mess_li.text(msg);
				mess_ul.append(mess_li);
			}

			elem.append( mess_div );
			elem.append( mess_ul );
		}
	};
});
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
var sampleApp = angular.module('sampleApp', [
	...
	'messageDirective',
]);
{% endhighlight %}

`public/index.html`

{% highlight html %}
...
<script src="directives/body.js"></script>
<script src="directives/head.js"></script>
<script src="directives/gravatar_for.js"></script>
<script src="directives/message.js"></script>
...
{% endhighlight %}

The other new idea is the `pluralize`.

{% highlight bash %}
~/sample_app $ npm install pluralize --save
{% endhighlight %}

`public/index.html`

{% highlight html %}
...
<script src="../node_modules/angular-md5/angular-md5.min.js"></script>
<script src="../node_modules/angular-form-for/dist/form-for.min.js"></script>
<script src="../node_modules/angular-form-for/dist/form-for.bootstrap-templates.js"></script>
<script src="../node_modules/pluralize/pluralize.js"></script>
...
{% endhighlight %}

`public/assets/stylesheets/custom.css`

{% highlight css %}
/* forms */
...
#error_explanation {
  color: red;
}

#error_explanation ul {
  color: red;
  margin: 0 0 30px 0;
}

.field_with_errors .form-control {
  color: #b94a48;
}
{% endhighlight %}

The `pluralize` takes an integer argument and then returns the number with a properly pluralized version of its second argument.

{% highlight javascript %}
> var pluralize = require('pluralize')
> pluralize("error", 1, true)
'1 error'
> pluralize("error", 5, true)
'5 errors'
{% endhighlight %}

Underlying this method is a powerful inflector that knows how to pluralize a large number of words, including many with irregular plurals.

{% highlight javascript %}
> pluralize("woman", 2, true)
'2 women'
> pluralize("erratum", 3, true)
'3 errata'
{% endhighlight %}

<img src="/img/tuts/unsuccessful_signups1.png" alt="unsuccessful signups 1" width="100%" />

### A test for invalid submission

In the days before powerful web frameworks with full testing capabilities, developers had to test forms by hand. For example, to test a signup page manually, we would have to visit the page in a browser and then submit alternately invalid and valid data, verifying in each case that the application's behavior was correct.

To get started, we first generate an integration test file for signing up users, which we'll call `users_signup`

`public/test/e2e_test/integration/users_signup_test.js`

{% highlight javascript %}
describe('UsersSignupTest', function() {
	it('invalid signup information', function() {
		var current_url = 'http://localhost:1337/#/signup';
		browser.get(current_url);
		element(by.css('[name="name"]')).sendKeys('');
		element(by.css('[name="email"]')).sendKeys('user@invalid');
		element(by.css('[name="password"]')).sendKeys('foo');
		element(by.css('[name="password_confirmation"]')).sendKeys('bar');
		element(by.css('[name="commit"]')).click();
		expect( element.all(by.css('.has-error')).count() ).toEqual(3);
	});
});
{% endhighlight %}

The test suite should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
Using the selenium server at http://localhost:4444/wd/hub
[launcher] Running 1 instances of WebDriver
Started
.......

7 specs, 0 failures
{% endhighlight %}
