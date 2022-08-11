var {n, toHtml} = require('htm');
var {sitePath} = require('siteUtils');

class CbnList {
	make() {
		this.root = n('div.mainPage',
			n('div.sideBar',
				n('div.catIntro.box',
					n('h2', 'What is CAT?'),
					n('p', `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`),
					n('div.controls',
						n('button', {href: sitePath('/what_is_cat')}, 'Read more...'),
					),
				),
				
				n('div.upload.box',
					n('h2', 'Load a Causal BN'),
					n('div.uploadChoice',
						n('div.dragAndDrop',
							n('div', 'Drag and Drop'),
						),
						n('div.divider', n('span','')),
						n('form', {method:'post', action:'/upload', enctype:'multipart/form-data'}, 
							n('div.chooseFile',
								n('div', 'Or browse:'),
								n('button', 'Upload...', {type:'button', onclick: `document.querySelector('input[name=uploadCbn]').click()`}),
								n('input', {type: 'file', name: 'uploadCbn', style: 'display:none', onchange: `this.form.submit()`}),
							),
						),
					),
					n('div.uploadInfo',
						'CAT can accept any files supported by GeNIe (including Netica and HUGIN files)',
					),
				),
			),
			
			n('div.mainBns', 
				this.myBnList = n('div.cbnList.box.myBns',
					n('h2', 'My Causal BNs'),
					this.myBnListContents = n('div.cbnListContents'),
				),
				this.cbnList = n('div.cbnList.box',
					n('h2', 'Public Library of Causal BNs'),
					this.cbnListContents = n('div.cbnListContents'),
				),
			),
		);
	}
	
	toHtml() { return this.root.outerHTML; }
	
	makeBnEntry(bn) {
		return n('div.cbn.box',
			n('a', n('h2', {href: sitePath(`bn?id=${bn.id}`)}, bn.name)),
			n('p.description', bn.description),
			n('div.fields',
				bn.author && n('div.field',   n('label', 'Author:'), n('span', bn.author),   ),
				bn.keywords && n('div.field',   n('label', 'Keywords:'), n('span', bn.keywords),   ),
			),
			n('div.controls',
				n('button', 'Open', {href: sitePath(`bn?id=${bn.id}`)}),
			),
		);
	}
	
	$handleUpdate(m) {
		if (m.publicBns) {
			while (this.cbnListContents.hasChildNodes()) {
				this.cbnListContents.firstChild.remove();
			}
			this.cbnListContents.append(
				...m.publicBns.map(bn => this.makeBnEntry(bn)),
			);
		}
		if (m.myBns) {
			while (this.myBnListContents.hasChildNodes()) {
				this.myBnListContents.firstChild.remove();
			}
			this.myBnListContents.append(
				...m.myBns.map(bn => this.makeBnEntry(bn)),
			);
		}
		/*if (m.hasUser != null) {
			this.root.classList.add('noUser');
		}*/
	}
};

module.exports = {
	noUserRequired: true,
	template: 'StandardPage',
	component: CbnList,
	async prepareData(req,res,db) {
		let publicBns = await db.all('select id, name, description, author, keywords, date from bns where visibility = "public"');
		//throw new Error('yoo');
		let myBns = await db.all('select id, name, description, date from bns where userId = ?', req._user?.id);
		return {publicBns, myBns, hasUser: req._user?.id};
	},
	/*async makeComponent(data) {
		let cbnList = new CbnList();
		cbnList.make();
		cbnList.$handleUpdate(data);
		return cbnList;
	},*/
}