var cb = function () {
	var l1 = document.createElement('link');
	l1.rel = 'stylesheet';
	l1.href = 'https://fonts.googleapis.com/css?family=Lato:100,300,400,700,900,100italic,300italic,400italic,700italic,900italic';
	var h1 = document.getElementsByTagName('head')[0];
	h1.parentNode.insertBefore(l1, h1);

	var l2 = document.createElement('link');
	l2.rel = 'stylesheet';
	l2.href = 'https://fonts.googleapis.com/css?family=Arizonia';
	var h2 = document.getElementsByTagName('head')[0];
	h2.parentNode.insertBefore(l2, h2);

	var l3 = document.createElement('link');
	l3.rel = 'stylesheet';
	l3.href = '/css/style.css';
	var h3 = document.getElementsByTagName('head')[0];
	h3.parentNode.insertBefore(l3, h3);

	var l4 = document.createElement('link');
	l4.rel = 'stylesheet';
	l4.href = '/css/syntax.css';
	var h4 = document.getElementsByTagName('head')[0];
	h4.parentNode.insertBefore(l4, h4);
};
var raf = requestAnimationFrame || mozRequestAnimationFrame ||
	webkitRequestAnimationFrame || msRequestAnimationFrame;
if (raf) raf(cb);
else window.addEventListener('load', cb);
