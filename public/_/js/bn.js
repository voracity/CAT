var refs = {};

var bn = {
	guiEnabled: true,
	nodes: {},
	evidence: {},
	/// For now, only 1 node can be in a given role, and only 1 state of the node be selected
	roles: {},
	selectedStates: {},
	beliefs: {},
	drawArcs() {
		let bnView = document.querySelector('.bnView');
		for (let node of bn.model) {
			for (let parentName of node.parents) {
				let from = document.querySelector(`.node[data-name=${parentName}]`);
				let to = document.querySelector(`.node[data-name=${node.name}]`);
				//debugger;
				draw.drawArrowBetweenEls(bnView, from, to);
			}
		}
	},
	getNode(nodeName) {
		if (!(nodeName in this.nodes)) {
			this.nodes[nodeName] = new Node(this, nodeName);
		}

		return this.nodes[nodeName];
	},
	gui(method, ...args) {
		if (this.guiEnabled) {
			this['gui'+method](...args);
		}
	},
	
	
	async update(evidence = {}) {
		for (let [k,v] of Object.entries(evidence)) {
			if (v === null) {
				delete this.evidence[k];
			}
			else {
				this.evidence[k] = v;
			}
		}
		let reqData = await (await fetch(window.location.href + '&requestType=data&returnType=beliefs&evidence='+JSON.stringify(this.evidence)+'&roles='+JSON.stringify(this.roles)+'&selectedStates='+JSON.stringify(this.selectedStates))).json();
		//let nodeBeliefs = {};
		for (let node of reqData.model) {
			this.beliefs[node.name] = node.beliefs;
		}
		this.measureResults = reqData.measureResults;
		this.gui('Update');
		this.guiUpdateInfoWindows();
	},
	
	async guiUpdate() {
		bnDetail.$handleUpdate({nodeBeliefs: this.beliefs});
	},

	guiUpdateInfoWindows() {
		q('div.infoWindow')?.remove();
		q('div.ciTableWindow')?.remove();
		if (this.roles?.cause?.length && this.roles?.effect?.length) {
			let cause = this.roles.cause[0];
			let effect = this.roles.effect[0];
			let causeStateI = this.selectedStates[cause];
			let effectStateI = this.selectedStates[effect];
			let causeState = causeStateI !== undefined ? this.getNode(cause).model.states[causeStateI] : null;
			let effectState = effectStateI !== undefined ? this.getNode(effect).model.states[effectStateI] : null;
			q('.infoWindows').append(n('div.infoWindow',
				n('h2', 'Measures'),
				n('div.info',
					n('div.field',
						n('label', 'Cause:'),
						n('span.cause', cause, causeState ? `=${causeState}` : ''),
					),
					n('div.field',
						n('label', 'Effect:'),
						n('span.effect', effect, effectState ? `=${effectState}` : ''),
					),
					Object.values(this.measureResults).map(measure => n('div.field', {title: measure.tooltip},
						n('label', measure.title+':'),
						n('span.value', isNaN(measure.value) ? measure.value : Math.round(measure.value*10000)/10000,
							measure.percent ? n('span.percent', ' (', Math.round(measure.percent*1000)/10, '%)') : ''),
					)),
				),
			));
		}
		else {
			
		}
		
		if (this.roles?.effect?.length) {
			q('.infoWindows').append(
				n('div.ciTableWindow',
					n('div.showTable',
						n('button.showCiTable', 'Show CI Table', {on: {click: async event => {
							let reqData = await (await fetch(window.location.href + '&requestType=data&returnType=ciTable&evidence='+JSON.stringify(this.evidence)+'&roles='+JSON.stringify(this.roles)+'&selectedStates='+JSON.stringify(this.selectedStates))).json();
							let table = n('table', n('tr', ['Cause', 'CI', '%'].map(s => n('th', s))));
							for (let row of reqData.ciTable) {
								table.append(n('tr',
									n('td', row.cause),
									n('td', Math.round(row.value*10000)/10000),
									n('td', Math.round(row.percent*1000)/10),
								));
							}
							q('.ciTable').append(table);
						}}}),
					),
					n('div.ciTable'),
				)
			);
		}
	},
};

/// Get node from el
refs.Node = function(el) {
	let nodeName = el.closest('.node').dataset.name;
	return bn.getNode(nodeName);
}

class Node {
	constructor(bn, nodeName) {
		this.bn = bn;
		this.nodeName = nodeName;
		this.role = null;
		this.guiEnabled = true;
		this.model = bn.model.find(n => n.name == nodeName);
	}
	
	el() {
		return q(`.node[data-name="${this.nodeName}"]`);
	}
	gui(method, ...args) {
		if (this.guiEnabled) {
			this['gui'+method](...args);
		}
	}
	
	setRole(role) {
		if (role == this.role)  return;
		
		/// Make sure any other node with this role is cleared, and their selected states cleared
		if (this.bn.roles[role]) {
			this.bn.roles[role].forEach(nodeName => this.bn.nodes[nodeName].setRole(null));
		}
		
		/// Delete current role if present
		if (this.role) {
			let i = this.bn.roles[this.role].indexOf(this.nodeName);
			if (i > -1)  this.bn.roles[this.role].splice(i, 1);
			delete this.bn.selectedStates[this.nodeName];
		}
		
		this.role = role;
		if (role) {
			if (!this.bn.roles[role])  this.bn.roles[role] = [];
			this.bn.roles[role].push(this.nodeName);
		}
		this.gui('SetRole');
	}
	guiSetRole() {
		if (this.role) {
			this.el().dataset.role = this.role;
		}
		else {
			delete this.el().dataset.role;
		}
		/// Update selected states
		let selStates = this.bn.selectedStates[this.nodeName] || [];
		this.el().querySelectorAll('.target input').forEach((inp,i) => inp.checked = selStates.includes(i));
		//this.bn.gui('UpdateInfoWindows');
	}
	
	guiPopupMenu() {
		let menu = new Menu({type:"contextMenu", items: [
			new MenuAction('Make Cause', _=>{this.setRole('cause'); this.bn.update(); menu.dismiss()}),
			new MenuAction('Make Effect', _=>{this.setRole('effect'); this.bn.update(); menu.dismiss()}),
			new MenuAction('Clear Role', _=>{this.setRole(null); this.bn.update({[this.nodeName]:null}); menu.dismiss()}),
		]});
		let {left,bottom} = this.el().querySelector('a.menu').getBoundingClientRect();
		menu.popup({left,top:bottom});
	}
	
	static guiSetupEvents() {
		q('.bnView').addEventListener('click', event => {
			event.stopPropagation();
			let menuButton = event.target.closest('a.menu');
			if (menuButton) {
				refs.Node(event.target).guiPopupMenu();
			}
		});
	}
}

document.addEventListener('DOMContentLoaded', event => {
	window.bnDetail = new BnDetail;
	bnDetail.make(document.querySelector('.bnDetail'));
	document.querySelector('.bnView').addEventListener('click', async event => {
		let target = event.target.closest('.target');
		if (target) {
			let stateI = Number(target.closest('.state').dataset.index);
			let nodeName = target.closest('.node').dataset.name;
			let thisInput = target.querySelector('input');
			
			target.closest('.node').querySelectorAll('.target input').forEach(i => i != thisInput && (i.checked = false));
			
			if (thisInput.checked) {
				bn.selectedStates[nodeName] = [stateI];
			}
			else {
				delete bn.selectedStates[nodeName];
			}
			
			bn.update(bn.evidence);
			
			return;
		}
		let state = event.target.closest('.state');
		if (state) {
			let nodeName = state.closest('.node').dataset.name;
			let evidence = {};
			if (nodeName in bn.evidence && bn.evidence[nodeName] == state.dataset.index) {
				//delete bn.evidence[nodeName];
				evidence[nodeName] = null;
				state.closest('.node').classList.remove('hasEvidence');
			}
			else {
				//bn.evidence[nodeName] = state.dataset.index;
				evidence[nodeName] = state.dataset.index;
				state.closest('.node').classList.add('hasEvidence');
			}
			bn.update(evidence);
		}
	});
	
	Node.guiSetupEvents();
});