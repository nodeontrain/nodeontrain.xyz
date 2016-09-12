(function () {
	var s = document.createElement('script');
	s.type = 'text/javascript';
	s.async = true;
	s.src = '//www.mytemplatestorage.com/wp-content/themes/mts3/js/widget-generator/dist/widget/widget.min.js';
	s.onload = function () {
		var w = new MTSWidget.widget('//www.mytemplatestorage.com', {
			uid: 'mts-5e9ef812-b9b7-4e29-8172-8d96a7abf903',
			affid: 'train',
			"title": '',
			"type": '0',
			"category": '0',
			"popularity": '120823',
			"cols": '3',
			"rows": '1',
			"showPrice": '1',
			"rangeOf": '50',
			"size": 'small-size',
			"paddings": '5',
			"margins": '5',
			"showTmLogo": '0',
			"showTemplateTitle": '1',
			"showTemplateTypeLogo": '1'
		});
		w.create();
	};
	var h = document.getElementsByTagName('script')[0];
	h.parentNode.insertBefore(s, h);
})();
