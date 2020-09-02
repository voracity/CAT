var {n} = require('htm');
var {sitePath} = require('siteUtils');

class StandardPage {
	make() {
		this.root = n('html',
			this.headEl = n('head',
				n('link', {href: sitePath('/_/css/cat.css'), rel: 'stylesheet', type: 'text/css'}),
				n('link', {href: sitePath('/_/js/menu/menu_styles.css'), rel: 'stylesheet', type: 'text/css'}),
				/*n('style', `
					.cbi { color: rgb(128,0,0); }
				`),*/
				n('script', {src: sitePath('/_/js/components.js')}),
				n('script', {src: sitePath('/_/js/htm.js')}),
				n('script', {src: sitePath('/_/js/utils.js')}),
				n('script', {src: sitePath('/_/js/menu/menu.js')}),
			),
			n('body',
				n('div.header',
					'Causal Attribution Tool (beta)',
				),
				this.bodyEl = n('div.content',
				
				),
			),
		);
	}
	
	toHtml() { return '<!doctype html>\n'+this.root.outerHTML; }
	
	$handleUpdate(m) {
		if (m.body) {
			this.bodyEl.append(m.body);
		}
	}
}

module.exports = {
	StandardPage,
}