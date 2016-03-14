---
layout: tuts
title: Slightly dynamic pages
prev_section: first_testing
next_section: some_structure
permalink: /tuts/dynamic_pages/
---

Our plan is to edit the Home, Help, and About pages to make page titles that change on each page. This will involve using the <title> tag in our page views.

The (mostly) static pages for the sample app:

<div class="mobile-side-scroller">
<table>
	<thead>
		<tr>
		<th>URL</th>
		<th>Base title</th>
		<th>Variable title</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>
				<p><code>/static_pages/home</code></p>
			</td>
			<td>
				<p>"Node On Train Tutorial Sample App"</p>
			</td>
			<td>
				<p>"Home"</p>
			</td>
		</tr>
		<tr>
			<td>
				<p><code>/static_pages/help</code></p>
			</td>
			<td>
				<p>"Node On Train Tutorial Sample App"</p>
			</td>
			<td>
				<p>"Help"</p>
			</td>
		</tr>
		<tr>
			<td>
				<p><code>/static_pages/about</code></p>
			</td>
			<td>
				<p>"Node On Train Tutorial Sample App"</p>
			</td>
			<td>
				<p>"About"</p>
			</td>
		</tr>
	</tbody>
</table>
</div>

### Testing titles

We’ll write simple tests for each of the titles

`public/test/e2e_test/controllers/static_pages_controller_test.js`

{% highlight javascript %}
describe('staticPagesControllerTest', function() {

	it('should get home', function() {
		var current_url = 'http://localhost:1337/#/static_pages/home';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/static_pages/home');
		expect( element(by.css('body')).getText() ).not.toEqual('');
		expect(browser.getTitle()).toEqual('Home | Node On Train Tutorial Sample App');
	});
	it('should get help', function() {
		var current_url = 'http://localhost:1337/#/static_pages/help';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/static_pages/help');
		expect( element(by.css('body')).getText() ).not.toEqual('');
		expect(browser.getTitle()).toEqual('Help | Node On Train Tutorial Sample App');
	});

	it('should get about', function() {
		var current_url = 'http://localhost:1337/#/static_pages/about';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/static_pages/about');
		expect( element(by.css('body')).getText() ).not.toEqual('');
		expect(browser.getTitle()).toEqual('About | Node On Train Tutorial Sample App');
	});

});
{% endhighlight %}

With the tests, you should verify that the test suite is currently failing

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
3 specs, 3 failures
{% endhighlight %}

### Adding page titles

Using the head directive and state data to dynamically change title

`public/app.js`

{% highlight javascript %}
.state('static_pages_help', {
	url: '/static_pages/help',
	templateUrl: 'partials/static_pages/help.html',
	controller: 'StaticPagesHelpCtrl',
	data: {
		title: 'Help'
	}
})
.state('static_pages_home', {
	url: '/static_pages/home',
	templateUrl: 'partials/static_pages/home.html',
	controller: 'StaticPagesHomeCtrl',
	data: {
		title: 'Home'
	}
})
.state('static_pages_about', {
	url: '/static_pages/about',
	templateUrl: 'partials/static_pages/about.html',
	controller: 'StaticPagesAboutCtrl',
	data: {
		title: 'About'
	}
})
{% endhighlight %}


`public/directives/head.js`

{% highlight javascript %}
var headDirective = angular.module('headDirective', []);

headDirective.directive('head', ['$state', '$rootScope', function($state, $rootScope) {
	return {
		restrict: 'E',
		link: function(scope, elem, attrs) {
			elem.prepend('<link rel="shortcut icon" href="assets/images/favicon.ico">');

			$rootScope.base_title = 'Node On Train Tutorial Sample App';
			$rootScope.title = $rootScope.base_title;

			scope.current_state = $state;
			scope.$watch('current_state.current.name', function(newValue, oldValue) {
				if (newValue) {
					if ($state.current.data && $state.current.data.title) {
						$rootScope.title = $state.current.data.title + ' | ' + $rootScope.base_title;
					} else {
						if ($rootScope.provide_title)
							$rootScope.title = $rootScope.provide_title + ' | ' + $rootScope.base_title;
						else
							$rootScope.title = $rootScope.base_title;
					}
				}
			});
		}
	};
}]);
{% endhighlight %}

`public/index.html`

<figure class="highlight"><pre><code class="language-html" data-lang="html"><span class="nt">&lt;title&gt;</span>&#123;&#123; title &#125;&#125;<span class="nt">&lt;/title&gt;</span></code></pre></figure>

We can simply verify that the test suite is still passing

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
3 specs, 0 failures
{% endhighlight %}

### Setting the root route

Setting the root route to the Home page.

`public/app.js`

{% highlight javascript %}
sampleApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/static_pages/home');
	$stateProvider
	.state('static_pages_help', {
		url: '/static_pages/help',
		templateUrl: 'partials/static_pages/help.html',
		controller: 'StaticPagesHelpCtrl',
		data: {
			title: 'Help'
		}
	})
	.state('static_pages_home', {
		url: '/static_pages/home',
		templateUrl: 'partials/static_pages/home.html',
		controller: 'StaticPagesHomeCtrl',
		data: {
			title: 'Home'
		}
	})
	.state('static_pages_about', {
		url: '/static_pages/about',
		templateUrl: 'partials/static_pages/about.html',
		controller: 'StaticPagesAboutCtrl',
		data: {
			title: 'About'
		}
	})
}]);
{% endhighlight %}
