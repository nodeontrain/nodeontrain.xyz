---
layout: tuts
title: Adding some structure
prev_section: dynamic_pages
next_section: layout_links
permalink: /tuts/some_structure/
---

In this section we'll add some structure to the layout and give it some minimal styling with CSS.

### Site navigation

As a first step toward adding links and styles to the sample application, we'll update the site layout file `public/index.html` with additional HTML structure. This includes some additional divisions, some CSS classes, and the start of our site navigation.

{% highlight html %}
<body>
	<header class="navbar navbar-fixed-top navbar-inverse">
		<div class="container">
			<a href="#" id="logo">sample app</a>
			<nav>
				<ul class="nav navbar-nav navbar-right">
					<li><a href="#">Home</a></li>
					<li><a href="#">Help</a></li>
					<li><a href="#">Log in</a></li>
				</ul>
			</nav>
		</div>
	</header>
	<div class="container" ui-view>
	</div>
</body>
{% endhighlight %}

To take advantage of the upcoming style elements, we'll add some extra elements to the `public/partials/static_pages/home.html` view.

{% highlight html %}
<div class="center jumbotron">
  <h1>Welcome to the Sample App</h1>

  <h2>
	This is the home page for the
	<a href="http://www.nodeontrain.xyz/">Node On Train Tutorial</a>
	sample application.
  </h2>

	<a class="btn btn-lg btn-primary" href="#">Sign up now!</a>
	<a href="http://www.nodeontrain.xyz/"><img alt="Trainjs logo" src="assets/images/trainjs.png"></a>
</div>
{% endhighlight %}

### Bootstrap and custom CSS

Our first step is to add Bootstrap

{% highlight bash %}
~/sample_app $ npm install bootstrap --save
{% endhighlight %}

The first step toward getting custom CSS to work is to create such a custom CSS file `public/assets/stylesheets/custom.css`. Inside the file for the custom CSS, we can use the @import function to include Bootstrap

{% highlight css %}
@import url("../../../node_modules/bootstrap/dist/css/bootstrap.min.css");
{% endhighlight %}

Next we'll add some CSS that will be used site-wide for styling the layout and each individual page.

{% highlight css %}
@import url("../../../node_modules/bootstrap/dist/css/bootstrap.min.css");

/* universal */

body {
  padding-top: 60px;
}

section {
  overflow: auto;
}

textarea {
  resize: vertical;
}

.center {
  text-align: center;
}

.center h1 {
  margin-bottom: 10px;
}

/* typography */

h1, h2, h3, h4, h5, h6 {
  line-height: 1;
}

h1 {
  font-size: 3em;
  letter-spacing: -2px;
  margin-bottom: 30px;
  text-align: center;
}

h2 {
  font-size: 1.2em;
  letter-spacing: -1px;
  margin-bottom: 30px;
  text-align: center;
  font-weight: normal;
  color: #777;
}

p {
  font-size: 1.1em;
  line-height: 1.7em;
}

/* header */

#logo {
  float: left;
  margin-right: 10px;
  font-size: 1.7em;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: -1px;
  padding-top: 9px;
  font-weight: bold;
}

#logo:hover {
  color: #fff;
  text-decoration: none;
}
{% endhighlight %}

Include the custom CSS in `public/index.html`

{% highlight html %}
<link rel="stylesheet" href="../node_modules/bootstrap/dist/css/bootstrap.min.css">
{% endhighlight %}

The result of the CSS

<img src="/img/tuts/some_structure1.png" alt="Some Structure 1" width="100%" />


### Partials

The header HTML forms a logical unit, so it should all be packaged up in one place. The way to achieve this in Angular is to use a facility called partials.

Let's first take a look at what the layout looks like after the partials are defined in `public/index.html`

{% highlight html %}
<body>
	<header class="navbar navbar-fixed-top navbar-inverse" ng-include="'partials/layouts/_header.html'">
	</header>
	<div class="container" ui-view>
	</div>
</body>
{% endhighlight %}

Similarly, we can move the header material into the partial shown in `public/partials/layouts/_header.html`

{% highlight html %}
<div class="container">
	<a href="#" id="logo">sample app</a>
	<nav>
		<ul class="nav navbar-nav navbar-right">
			<li><a href="#">Home</a></li>
			<li><a href="#">Help</a></li>
			<li><a href="#">Log in</a></li>
		</ul>
	</nav>
</div>
{% endhighlight %}

Now that we know how to make partials, let's add a site footer to go along with the header. By now you can probably guess that we'll call it _footer.html and put it in the layouts directory

`public/partials/layouts/_footer.html`

{% highlight html %}
<small>
	The <a href="http://www.nodeontrain.xyz/">Node On Train Tutorial</a>
	by <a href="https://twitter.com/thanhdd_it">Dang Thanh</a>
</small>
<nav>
	<ul>
		<li><a href="#">About</a></li>
		<li><a href="#">Contact</a></li>
		<li><a href="http://nodeontrain.xyz/news/">News</a></li>
	</ul>
</nav>
{% endhighlight %}

We can render the footer partial in the layout by following the same pattern as the stylesheets and header partials

`public/index.html`

{% highlight html %}
<body>
	<header class="navbar navbar-fixed-top navbar-inverse" ng-include="'partials/layouts/_header.html'">
	</header>
	<div class="container">
		<div ui-view></div>
		<footer class="footer" ng-include="'partials/layouts/_footer.html'">
		</footer>
	</div>
</body>
{% endhighlight %}

Of course, the footer will be ugly without some styling

`public/assets/stylesheets/custom.css`

{% highlight css %}
/* footer */
footer {
  margin-top: 45px;
  padding-top: 5px;
  border-top: 1px solid #eaeaea;
  color: #777;
}

footer a {
  color: #555;
}

footer a:hover {
  color: #222;
}

footer small {
  float: left;
}

footer ul {
  float: right;
  list-style: none;
}

footer ul li {
  float: left;
  margin-left: 15px;
}
{% endhighlight %}

<img src="/img/tuts/some_structure2.png" alt="some structure 2" width="100%" />
