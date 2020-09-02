var refs = {};

var bn = {
	nodes: {},
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
			this.nodes[nodeName] = new Node(nodeName);
		}

		return this.nodes[nodeName];
	},
};

/// Get node from el
refs.Node = function(el) {
	let nodeName = el.closest('.node').dataset.name;
	return bn.getNode(nodeName);
}

class Node {
	constructor(nodeName) {
		this.nodeName = nodeName;
		this.role = null;
		this.guiEnabled = true;
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
		this.role = role;
		this.gui('SetRole');
	}
	guiSetRole() {
		this.el().dataset.role = this.role;
	}

	guiPopupMenu() {
		let menu = new Menu({type:"contextMenu", items: [
			new MenuAction('Make Cause', _=>{this.setRole('cause'); menu.dismiss()}),
			new MenuAction('Make Effect', _=>{this.setRole('effect'); menu.dismiss()}),
			new MenuAction('Clear Role', _=>{this.setRole(null); menu.dismiss()}),
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
	window.bnEvidence = {};
	bnDetail.make(document.querySelector('.bnDetail'));
	document.querySelector('.bnView').addEventListener('click', async event => {
		let state = event.target.closest('.state');
		if (state) {
			let nodeName = state.closest('.node').dataset.name;
			if (nodeName in bnEvidence && bnEvidence[nodeName] == state.dataset.index) {
				delete bnEvidence[nodeName];
			}
			else {
				bnEvidence[nodeName] = state.dataset.index;
			}
			let reqData = await (await fetch(window.location.href + '&requestType=data&evidence='+JSON.stringify(bnEvidence))).json();
			let nodeBeliefs = {};
			for (let node of reqData.model) {
				nodeBeliefs[node.name] = node.beliefs;
			}
			bnDetail.$handleUpdate({nodeBeliefs});
		}
	});
	
	Node.guiSetupEvents();
});