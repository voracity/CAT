var {n, toHtml} = require('htm');
var {sitePath, ...siteUtils} = require('siteUtils');
var {Net, Node} = require('../bni_smile');

class BnDetail {
	make(root) {
		this.root = root || n('div.bnDetail',
			n('script', {src: 'https://code.jquery.com/jquery-3.4.1.slim.min.js'}),
			n('script', {src: sitePath('/_/js/arrows.js')}),
			n('script', {src: sitePath('/_/js/bn.js')}),
			n('div.title'),
			n('div.bnView'),
		);
		this.titleEl = this.root.querySelector('.title');
		this.bnView = this.root.querySelector('.bnView');
	}
	
	toHtml() { return this.root.outerHTML; }
	
	$handleUpdate(m) {
		let barMax = 100; //px
		if (m.title) {
			this.titleEl.textContent = m.title;
		}
		if (m.model) {
			
			this.bnView.querySelectorAll('.node').forEach(n => n.remove());
			let nodes = m.model.map(node => n('div.node',
				{dataName: node.name},
				{style: `left: ${node.pos[0]}px; top: ${node.pos[1]}px`},
				n('div.controls',
					n('a.menu', {href: 'javascript:void(0)'}, '\u2630'),
				),
				n('h3', node.name),
				n('div.states',
					node.states.map((s,i) => n('div.state',
						{dataIndex: i},
						n('span.label', s),
						n('span.prob', (node.beliefs[i]*100).toFixed(1)),
						n('span.barParent', n('span.bar', {style: `width: ${node.beliefs[i]*barMax}%`}))),
					),
				),
			));
			this.bnView.append(...nodes);
			this.bnView.append(n('script', `
				bn.model = ${JSON.stringify(m.model)};
				bn.drawArcs();
			`));
		}
		if (m.nodeBeliefs) {
			for (let [nodeName,beliefs] of Object.entries(m.nodeBeliefs)) {
				let nodeEl = this.bnView.querySelector(`div.node[data-name=${nodeName}]`);
				nodeEl.querySelectorAll('.state').forEach((state,i) => {
					state.querySelector('.prob').textContent = (beliefs[i]*100).toFixed(1);
					state.querySelector('.bar').style.width = (beliefs[i]*barMax)+'%';
				});
			}
		}
	}
}

module.exports = {
	component: BnDetail,
	async prepareData(req,res,db) {
		/// tbd
		let bn = await db.get('select name, url from bns where id = ?', req.query.id);
		console.log('HI');
		let net = new Net(`public/bns/${bn.url}`)
		net.autoUpdate(false);
		net.compile();
		
		if (req.query.evidence) {
			let evidence = JSON.parse(req.query.evidence);
			for (let [nodeName,stateI] of Object.entries(evidence)) {
				console.log(nodeName, stateI);
				net.node(nodeName).finding(Number(stateI));
			}
		}
		
		net.update();
		console.log('HI2');
		bn.model = 
			net.nodes().map(node => ({
				type: 'node',
				name: node.name(),
				pos: node.position(),
				parents: node.parents().map(p => p.name()),
				states: node.states().map(s => s.name()),
				beliefs: node.beliefs(),
				//beliefs: [],
			}));
		console.log('HI3');
		/*bn.model = [
			{type: 'node', name: 'Visit to Asia', pos: [10,10]},
			{type: 'node', name: 'Tuberculosis', pos: [10,100], parents: ['Visit to Asia']},
		];*/
		return bn;
	},
}