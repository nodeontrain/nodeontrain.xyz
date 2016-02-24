---
layout: tuts
title: Directory structure
prev_section: usage
next_section: planning_app
permalink: /tuts/structure/
---

The directory structure for a newly created Trainjs app:

{% highlight bash %}
.
├── app
|   ├── controllers
|   └── models
├── config
|   ├── application.js
|   ├── database.json
|   └── routes.js
├── public
|   ├── assets
|   ├── partials
|   └── index.html
├── package.json
└── README.md
{% endhighlight %}

An overview of what each of these does:

<div class="mobile-side-scroller">
<table>
  <thead>
	<tr>
	  <th>File / Directory</th>
	  <th>Description</th>
	</tr>
  </thead>
  <tbody>
	<tr>
	  <td>
		<p><code>app/</code></p>
	  </td>
	  <td>
		<p>

		 Back-End Core application code, including models, controllers, and helpers

		</p>
	  </td>
	</tr>
	<tr>
	  <td>
		<p><code>config/</code></p>
	  </td>
	  <td>
		<p>

		  Application configuration

		</p>
	  </td>
	</tr>
	<tr>
	  <td>
		<p><code>public/</code></p>
	  </td>
	  <td>
		<p>

		 Front-End Core application code, including services, controllers, and partials

		</p>
	  </td>
	</tr>
		<tr>
	  <td>
		<p><code>public/assets</code></p>
	  </td>
	  <td>
		<p>

		  Applications assets such as cascading style sheets (CSS), JavaScript files, and images

		</p>
	  </td>
	</tr>
	<tr>
	  <td>
		<p><code>package.json</code></p>
	  </td>
	  <td>
		<p>

		  Module requirements for this app

		</p>
	  </td>
	</tr>
	<tr>
	  <td>
		<p><code>README.md</code></p>
	  </td>
	  <td>
		<p>

		  A brief description of the application

		</p>
	  </td>
	</tr>
  </tbody>
</table>
</div>
