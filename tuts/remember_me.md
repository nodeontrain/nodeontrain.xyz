---
layout: tuts
title: Remember me
prev_section: logging_out
next_section: updating_users
permalink: /tuts/remember_me/
---

The login system we finished in ["Logging in" section](https://nodeontrain.xyz/tuts/logging_in/) is self-contained and fully functional, but most websites have the additional capability of remembering users' sessions even after they close their browsers. In this section, we'll start by remembering user logins by default, expiring their sessions only when they explicitly log out.

### Remember token and digest

In ["Logging in" Section](https://nodeontrain.xyz/tuts/logging_in/), we used the Rails session method to store the user's id, but this information disappears when the user closes their browser. In this section, we'll take the first step toward persistent sessions by generating a remember token appropriate for creating permanent cookies together with a secure remember digest for authenticating those tokens.

We'll start by adding the required `remember_digest` attribute to the User model

{% highlight bash %}
~/sample_app $ sequelize migration:create --name add_remember_digest_to_users
{% endhighlight %}

`db/migrate/[timestamp]-add_remember_digest_to_users.js`

{% highlight javascript %}
'use strict';

module.exports = {
	up: function (queryInterface, Sequelize) {
		queryInterface.addColumn(
			'user',
			'remember_digest',
			Sequelize.STRING
		)
	},

	down: function (queryInterface, Sequelize) {

	}
};
{% endhighlight %}

Because we don't expect to retrieve users by remember digest, there's no need to put an index on the `remember_digest` column, and we can use the default migration as generated above

{% highlight bash %}
~/sample_app $ sequelize db:migrate
{% endhighlight %}

Now we have to decide what to use as a remember token. There are many mostly equivalent possibilities—essentially, any long random string will do.

{% highlight bash %}
~/sample_app $ npm install --save secure-random
~/sample_app $ npm install --save urlsafe-base64
{% endhighlight %}


`app/models/user.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;
var bcrypt = require('bcrypt');
var secureRandom = require('secure-random');
var URLSafeBase64 = require('urlsafe-base64');

var User = sequelize.define('user', {
	...
	password_confirmation: {
		type: Sequelize.VIRTUAL
	},
	remember_digest: {
		type: Sequelize.STRING
	},
	remember_token: {
		type: Sequelize.VIRTUAL
	}
}, {
	...
	instanceMethods: {
		...
	},
	classMethods: {
		digest: function(string){
			return bcrypt.hashSync(string, 10);
		},
		new_token: function(){
			var buf = secureRandom.randomBuffer(16);
			return URLSafeBase64.encode(buf);
		}
	}
});

var hasSecurePassword = function(user, options, callback) {
	if (user.password != user.password_confirmation) {
		throw new Error("Password confirmation doesn't match Password");
	}
	bcrypt.hash(user.get('password'), 10, function(err, hash) {
		if (err) return callback(err);
		user.set('password_digest', hash);
		return callback(null, options);
	});
};

User.beforeCreate(function(user, options, callback) {
	user.email = user.email.toLowerCase();
	if (user.password)
		hasSecurePassword(user, options, callback);
	else
		return callback(null, options);
})
User.beforeUpdate(function(user, options, callback) {
	user.email = user.email.toLowerCase();
	if (user.password)
		hasSecurePassword(user, options, callback);
	else
		return callback(null, options);
})

module.exports = User;
{% endhighlight %}

We can create a valid token and associated digest by first making a new remember token using User.new_token, and then updating the remember digest with the result of applying User.digest. This procedure gives the remember method

`app/models/user.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;
var bcrypt = require('bcrypt');
var secureRandom = require('secure-random');
var URLSafeBase64 = require('urlsafe-base64');

var User = sequelize.define('user', {
	...
}, {
	...
	instanceMethods: {
		authenticate: function(value) {
			if (bcrypt.compareSync(value, this.password_digest))
				return this;
			else
				return false;
		},
		remember: function() {
			this.setDataValue('remember_token', User.new_token());
			this.update({ remember_digest: User.digest(this.remember_token) });
		}
	},
	classMethods: {
		digest: function(string){
			return bcrypt.hashSync(string, 10);
		},
		new_token: function(){
			var buf = secureRandom.randomBuffer(16);
			return URLSafeBase64.encode(buf);
		}
	}
});
...
{% endhighlight %}

### Login with remembering

Adding an authenticated method to the User model.

`app/models/user.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;
var bcrypt = require('bcrypt');
var secureRandom = require('secure-random');
var URLSafeBase64 = require('urlsafe-base64');

var User = sequelize.define('user', {
	...
}, {
	...
	instanceMethods: {
		authenticate: function(value) {
			if (bcrypt.compareSync(value, this.password_digest))
				return this;
			else
				return false;
		},
		remember: function() {
			this.setDataValue('remember_token', User.new_token());
			this.update({ remember_digest: User.digest(this.remember_token) });
		},
		authenticated: function(remember_token) {
			return bcrypt.compareSync(remember_token, this.remember_digest);
		}
	},
	...
});
...
{% endhighlight %}

We're now in a position to remember a logged-in user, which we'll do by adding a remember helper to go along with log_in

`app/controllers/sessions_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');
function SessionsController() {
	this.create = function(req, res, next) {
		var user = ModelSync( User.findOne({ where: {email: req.body.email.toLowerCase()} }) );
		if (user && !user.errors && user.authenticate(req.body.password)) {
			sessionHelper.log_in(req, user);
			sessionHelper.remember(req, user);
			res.end(JSON.stringify(user));
		} else {
			res.end(JSON.stringify({
				error: 'Invalid email/password combination'
			}));
		}
	};
	this.destroy = function(req, res, next) {
		sessionHelper.log_out(req);
		res.end();
	};
	this.current_user = function(req, res, next) {
		res.end(JSON.stringify( sessionHelper.current_user(req) ));
	};
}

module.exports = SessionsController;
{% endhighlight %}

`app/helpers/sessions_helper.js`

{% highlight javascript %}
module.exports = {
	log_in: function(req, user) {
		req.session.user_id = user.id;
	},
	remember: function(req, user) {
		user.remember();
		req.cookies.set( "user_id", user.id, { expires: new Date(Date.now() + 20 * 365 * 24 * 3600000) } );
		req.cookies.set( "remember_token", user.remember_token, { expires: new Date(Date.now() + 20 * 365 * 24 * 3600000) } );
	},
	current_user: function(req) {
		return ModelSync( User.findById(req.session.user_id) );
	},
	log_out: function(req) {
		delete req.session.user_id;
	}
};
{% endhighlight %}


With the code above, a user logging in will be remembered in the sense that their browser will get a valid remember token, but it doesn't yet do us any good because the current_user method knows only about the temporary session

In the case of persistent sessions, we want to retrieve the user from the temporary session if `req.session.user_id` exists, but otherwise we should look for `req.cookies.get("user_id")` to retrieve (and log in) the user corresponding to the persistent session. We can accomplish this as follows

`app/helpers/sessions_helper.js`

{% highlight javascript %}
module.exports = {
	log_in: function(req, user) {
		req.session.user_id = user.id;
	},
	remember: function(req, user) {
		user.remember();
		req.cookies.set( "user_id", user.id, { expires: new Date(Date.now() + 20 * 365 * 24 * 3600000) } );
		req.cookies.set( "remember_token", user.remember_token, { expires: new Date(Date.now() + 20 * 365 * 24 * 3600000) } );
	},
	current_user: function(req) {
		if (req.session.user_id) {
			return ModelSync( User.findById(req.session.user_id) );
		} else if (req.cookies.get("user_id")) {
			var user = ModelSync( User.findById(req.cookies.get("user_id")) );
			if (user && !user.errors && user.authenticated(req.cookies.get("remember_token"))) {
				this.log_in(req, user);
				return user;
			} else {
				return false;
			}
		} else {
			return false;
		}
	},
	log_out: function(req) {
		delete req.session.user_id;
	}
};
{% endhighlight %}

### Forgetting users

To allow users to log out, we'll define methods to forget users in analogy with the ones to remember them. The resulting `user.forget` method just undoes `user.remember` by updating the remember digest with `null`

`app/models/user.js`

{% highlight javascript %}
...

var User = sequelize.define('user', {
	...
}, {
	...
	instanceMethods: {
		...
		authenticated: function(remember_token) {
			return bcrypt.compareSync(remember_token, this.remember_digest);
		},
		forget: function() {
			this.update({ remember_digest: null });
		}
	},
	...
});
...
{% endhighlight %}

`app/helpers/sessions_helper.js`

{% highlight javascript %}
module.exports = {
	...
	current_user: function(req) {
		...
	},
	forget: function(req, user) {
		user.forget();
		req.cookies.set( "user_id", null, { expires: 0 } );
		req.cookies.set( "remember_token", null, { expires: 0 } );
	},
	log_out: function(req) {
		this.forget(req, this.current_user(req));
		delete req.session.user_id;
	}
};
{% endhighlight %}

### Two subtle bugs

There are two closely related subtleties left to address. The first subtlety is that, even though the “Log out” link appears only when logged-in, a user could potentially have multiple browser windows open to the site. If the user logged out in one window, thereby setting current_user to `null`, clicking the “Log out” link in a second window would result in an error because of `this.forget(req, this.current_user(req))` in the log_out method. We can avoid this by logging out only if the user is logged in.

These are exactly the sorts of subtleties that benefit from test-driven development, so we'll write tests to catch the two errors before correcting them.

`public/test/e2e_test/integration/users_login_test.js`

{% highlight javascript %}
describe('UsersLoginTest', function() {
	it('login with valid information followed by logout', function(done) {
		var current_url = 'http://localhost:1337/#/login';
		browser.get(current_url);
		element(by.css('[name="email"]')).clear('');
		element(by.css('[name="password"]')).clear('');
		element(by.css('[name="email"]')).sendKeys('user@example.com');
		element(by.css('[name="password"]')).sendKeys('password');
		element(by.css('[name="commit"]')).click();

		expect( browser.getCurrentUrl() ).toContain('#/users/');
		expect( element.all(by.css('[ui-sref="login"]')).count() ).toEqual(0);
		expect( element.all(by.css('[ui-sref="user_detail({id: current_user.id})"]')).count() ).toEqual(1);

		browser.driver.executeScript(function() {
			window.open('http://localhost:1337/#/home');
		});

		browser.getAllWindowHandles().then(function (handles) {
			browser.driver.switchTo().window(handles[1]);
			element(by.css('.dropdown')).click();
			element.all(by.css('[ui-sref="logout"]')).click();
			expect( browser.getCurrentUrl() ).toContain('#/home');
			expect( element.all(by.css('[ui-sref="login"]')).count() ).toEqual(1);
			expect( element.all(by.css('[ui-sref="user_detail({id: current_user.id})"]')).count() ).toEqual(0);
			browser.driver.close();

			browser.driver.switchTo().window(handles[0]);
			element(by.css('.dropdown')).click();
			element.all(by.css('[ui-sref="logout"]')).click();
			expect( element.all(by.css('.alert-danger')).count() ).toEqual(0);
			done();
		});
	});

	...
});
{% endhighlight %}

The test suite is currently failing

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
12 specs, 1 failures
{% endhighlight %}

The application code simply involves calling log_out only if current_user exists

`app/controllers/sessions_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');
function SessionsController() {
	...
	this.destroy = function(req, res, next) {
		if (sessionHelper.current_user(req))
			sessionHelper.log_out(req);
		res.end();
	};
	this.current_user = function(req, res, next) {
		res.end(JSON.stringify( sessionHelper.current_user(req) ));
	};
}

module.exports = SessionsController;
{% endhighlight %}

At this point, the tests should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
12 specs, 0 failures
{% endhighlight %}

A test of `authenticated` with a nonexistent digest

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

	it('authenticated should return false for a user with null digest', function() {
		assert.equal(user.authenticated(''), false);
	});

});
{% endhighlight %}

Because `bcrypt.compareSync('', null)` raises an error, the test suite should now be failing

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  18 passing (262ms)
  1 failing
{% endhighlight %}

To fix the error, all we need to do is return false if the remember digest is null

`app/models/user.js`

{% highlight javascript %}
...

var User = sequelize.define('user', {
	...
}, {
	...
	instanceMethods: {
		...
		authenticated: function(remember_token) {
			if (this.remember_digest)
				return bcrypt.compareSync(remember_token, this.remember_digest);
			else
				return false;
		}
		...
	},
	...
});

...
{% endhighlight %}

With the code, our full test suite should be successful

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  19 passing
{% endhighlight %}


### “Remember me” checkbox

Adding a “remember me” checkbox to the login form.

`public/partials/sessions/new.html`

{% highlight html %}
<h1>Log in</h1>

<div class="row">
	<div class="col-md-6 col-md-offset-3">
		<form form-for="user" submit-with="login()" validation-rules="validation_rules">
			<text-field attribute="email" label="Email" type="email"></text-field>
			<text-field attribute="password" label="Password" type="password"></text-field>
			<checkbox-field attribute="remember_me" label-class="checkbox inline" label="Remember me on this computer" uid="session_remember_me"></checkbox-field>
			<input class="btn btn-primary" name="commit" type="submit" value="Log in" />
		</form>
		<p>New user? <a href ui-sref="signup">Sign up now!</a></p>
	</div>
</div>
{% endhighlight %}

`public/controllers/sessions_controller.js`

{% highlight javascript %}
'use strict';

var sessionsController = angular.module('sessionsController', []);

sessionsController.controller(
	'SessionsNewCtrl',
	['$scope', '$state', 'Sessions', 'flashHelper', function ($scope, $state, Sessions, flashHelper) {
		$scope.user = {email: '', password: '', remember_me: 0};
		...
	}]
);
{% endhighlight %}

`public/assets/stylesheets/custom.css`

{% highlight css %}
/* forms */
...
.checkbox {
  margin-top: -22px;
  margin-bottom: 10px;
}
.checkbox span {
  margin-left: 20px;
  font-weight: normal;
}

#session_remember_me {
  width: auto;
  margin-left: 0;
}
{% endhighlight %}

Having edited the login form, we're now ready to remember users if they check the checkbox and forget them otherwise.

`app/controllers/sessions_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');
function SessionsController() {
	this.create = function(req, res, next) {
		var user = ModelSync( User.findOne({ where: {email: req.body.email.toLowerCase()} }) );
		if (user && !user.errors && user.authenticate(req.body.password)) {
			sessionHelper.log_in(req, user);
			req.body.remember_me == 1 ? sessionHelper.remember(req, user) : sessionHelper.forget(req, user)
			res.end(JSON.stringify(user));
		} else {
			res.end(JSON.stringify({
				error: 'Invalid email/password combination'
			}));
		}
	};
	...
}

module.exports = SessionsController;
{% endhighlight %}

### Remember tests

To verify the behavior of the “remember me” checkbox, we'll write two tests, one each for submitting with and without the checkbox checked.

`public/test/e2e_test/integration/users_login_test.js`

{% highlight javascript %}
describe('UsersLoginTest', function() {
	...

	it('login with remembering', function(done) {
		element(by.css('.dropdown')).click();
		element.all(by.css('[ui-sref="logout"]')).click();
		var current_url = 'http://localhost:1337/#/login';
		browser.get(current_url);

		element(by.css('[name="email"]')).sendKeys('user@example.com');
		element(by.css('[name="password"]')).sendKeys('password');
		element(by.css('[name="remember_me"]')).click();
		element(by.css('[name="commit"]')).click();

		expect( browser.getCurrentUrl() ).toContain('#/users/');
		expect( element.all(by.css('[ui-sref="login"]')).count() ).toEqual(0);

		browser.manage().getCookie('remember_token').then(function (cookie) {
			expect(cookie.value).not.toEqual('');
			done();
		});
	});

	it('login without remembering', function(done) {
		element(by.css('.dropdown')).click();
		element.all(by.css('[ui-sref="logout"]')).click();
		var current_url = 'http://localhost:1337/#/login';
		browser.get(current_url);

		element(by.css('[name="email"]')).sendKeys('user@example.com');
		element(by.css('[name="password"]')).sendKeys('password');
		element(by.css('[name="commit"]')).click();

		expect( browser.getCurrentUrl() ).toContain('#/users/');
		expect( element.all(by.css('[ui-sref="login"]')).count() ).toEqual(0);

		browser.manage().getCookie('remember_token').then(function (cookie) {
			expect(cookie.value).toEqual('');
			done();
		});
	});
});
{% endhighlight %}

Assuming you didn't make the same implementation mistake I did, the tests should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
14 specs, 0 failures
{% endhighlight %}
