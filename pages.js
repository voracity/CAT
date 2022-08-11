var {n,chain} = require('htm');
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
				n('script', {src: sitePath('/_/js/cat.js')}),
			),
			n('body',
				n('div.header',
					n('h1', n('a', {href: '/'}, n('img.logo', {src:'/_/images/cat_logo.png', alt: 'CAT logo'})), n('span.text', 'Causal Attribution Tool (beta)')),
					n('div.siteLinks',
						this.loginSection = n('span.loginSection', n('button.login', 'Login')),
					),
				),
				this.contentEl = n('div.content',
				
				),
			),
		);
	}
	
	toHtml() { return '<!doctype html>\n'+this.root.outerHTML; }
	
	$handleUpdate(m) {
		if (m.body) {
			this.contentEl.append(m.body);
		}
		if (m.user) {
			chain(this.loginSection).set({innerHTML:''}).append(n('span.username', m.user.username));
		}
		if ('user' in m) {
			console.log(m.user, m.user == null);
			let cl = chain(this.root.querySelector('body').classList);
			if (m.user == null)  cl.add('noUser').remove('user');
			else  cl.remove('noUser').add('user');
		}
		if (m.h1) {
			this.root.querySelector('.header h1 .text').textContent = m.h1;
		}
	}
}

class BnPage extends StandardPage {
	make() {
		super.make();
		this.root.querySelector('body').classList.add('bnPage');
		this.$handleUpdate({h1: 'BN PAGE'});
	}
}

module.exports = {
	StandardPage,
	BnPage,
}