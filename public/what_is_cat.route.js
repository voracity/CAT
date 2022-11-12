var {n} = require('htm');
var fs = require('fs').promises;

class WhatIsCat {
	make(x, data) {
		this.root = n('div.whatIsCat.contentPage',
			n('h2', 'What is Causal Attribution?'),
			n('p', `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`),
		);
		this.root.innerHTML = data.contents.toString().replace(/images\//g, 'what_is_cat_files/images/'); 
		
	}
}

module.exports = {
	template: 'StandardPage',
	component: WhatIsCat,
	noUserRequired: true,
	async prepareData(req,res) {
		let contents = await fs.readFile('public/what_is_cat_files/CATExplainerV2.html');
		req._page.$handleUpdate({h1: "CAT: The Causal Attribution Tool", title: "What is CAT? - CAT"});
		return {contents};
	}
}