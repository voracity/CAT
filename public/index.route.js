var {n, toHtml} = require('htm');
var {sitePath} = require('siteUtils');

class CbnList {
	make() {
		this.root = n('div',
			n('div.catIntro.box',
				n('h2', 'What is CAT?'),
				n('p', `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`),
				n('div.controls',
					n('button', {href: sitePath('/what_is_cat')}, 'Read more...'),
				),
			),
			
			n('div.upload.box',
				n('h2', 'Upload a CBN'),
				n('div.uploadChoice',
					n('div.dragAndDrop',
						n('div', 'Drag and Drop'),
					),
					n('div.divider', n('span','OR')),
					n('div.chooseFile',
						n('div', 'From your computer:'),
						n('button', 'Upload...', {onclick: `document.querySelector('input[name=uploadCbn]').click()`}),
						n('input', {type: 'file', name: 'uploadCbn', style: 'display:none'}),
					),
				),
				n('div.uploadInfo',
					'CAT can accept any files supported by GeNIe (including Netica and HUGIN files)',
				),
			),
			
			this.cbnList = n('div.cbnList.box',
				n('h2', 'CBNs'),
				this.cbnListContents = n('div.cbnListContents'),
			),
		);
	}
	
	toHtml() { return this.root.outerHTML; }
	
	makeBnEntry(bn) {
		return n('div.cbn.box',
			n('a', n('h2', {href: sitePath(`bn?id=${bn.id}`)}, bn.name)),
			n('p.description', bn.description),
			n('div.fields',
				n('div.field',   n('label', 'Author:'), n('span', bn.author),   ),
				n('div.field',   n('label', 'Keywords:'), n('span', bn.keywords),   ),
			),
			n('div.controls',
				n('button', 'Open', {href: sitePath(`bn?id=${bn.id}`)}),
			),
		);
	}
	
	$handleUpdate(m) {
		if (m.bns) {
			while (this.cbnListContents.hasChildNodes()) {
				this.cbnListContents.firstChild.remove();
			}
			this.cbnListContents.append(
				...m.bns.map(bn => this.makeBnEntry(bn)),
			);
		}
	}
};

module.exports = {
	template: 'StandardPage',
	component: CbnList,
	async prepareData(req,res,db) {
		let bns = await db.all('select id, name, description, author, keywords, date from bns');
		return {bns};
	},
	/*async makeComponent(data) {
		let cbnList = new CbnList();
		cbnList.make();
		cbnList.$handleUpdate(data);
		return cbnList;
	},*/
}