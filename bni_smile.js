/// The napi versions are meant to be node version independent. Since ffi/ref/etc. aren't
/// updated promptly, the napi versions should be much more stable.
var ffi = require('ffi-napi');
var ref = require('ref-napi');
var ArrayType = require('ref-array-napi');
var fs = require('fs');

var voidPtr = ref.refType(ref.types.void);
/** This took forever to discover! Use it to take returned pointer arrays
	and convert them into JS arrays of the given size. e.g.
	C: double* somefunc();
	JS: pointerAsArray(<ffi.Library>.somefunc(), ref.types.double, 10)
**/
function pointerAsArray(ptr, type, size) {
	let buf = ref.reinterpret(ptr, type.size*size);
	return ArrayType(type)(buf, size);
}

var g = ffi.Library('bismile64', {
	'new_network': [voidPtr, []],
	'delete_network': [voidPtr, [voidPtr]],
	'UpdateBeliefs': [ref.types.void, [voidPtr]],
	'ReadFile': [ref.types.void, [voidPtr, 'string']],
	'AddNode': [ref.types.int, [voidPtr, 'int', 'string']],
	'DeleteNode': [ref.types.int, [voidPtr, 'int']],
	'FindNode': ['int', [voidPtr, 'string']],
	'GetNode': [voidPtr, [voidPtr, 'int']],
	'node_Definition': [voidPtr, [voidPtr]],
	'node_Value': [voidPtr, [voidPtr]],
	'nodeValue_GetMatrix': [voidPtr, [voidPtr]],
	'nodeDefinition_GetMatrix': [voidPtr, [voidPtr]],
	'dMatrix_GetSize': ['int', [voidPtr]],
	'dMatrix_GetItemsDouble': [ref.refType(ref.types.double), [voidPtr]],
	'intArray_NumItems': ['int', [voidPtr]],
	'intArray_Items': [ref.refType(ref.types.int), [voidPtr]],
	'node_Info': [voidPtr, [voidPtr]],
	'nodeInfo_Header': [voidPtr, [voidPtr]],
	'nodeInfo_Screen': [voidPtr, [voidPtr]],
	'screenInfo_position': [voidPtr, [voidPtr]],
	'rectangle_center_X_set': ['void', [voidPtr, 'int']],
	'rectangle_center_Y_set': ['void', [voidPtr, 'int']],
	'rectangle_center_X': ['int', [voidPtr]],
	'rectangle_center_Y': ['int', [voidPtr]],
	'rectangle_width_set': ['void', [voidPtr, 'int']],
	'rectangle_height_set': ['void', [voidPtr, 'int']],
	'rectangle_width': ['int', [voidPtr]],
	'rectangle_height': ['int', [voidPtr]],
	'header_GetId': ['string', [voidPtr]],
	'header_GetName': ['string', [voidPtr]],
	'net_Header': [voidPtr, [voidPtr]],
	'header_GetId': ['string', [voidPtr]],
	'header_SetId': [voidPtr, [voidPtr, 'string']],
	'header_GetName': ['string', [voidPtr]],
	'header_SetName': [voidPtr, [voidPtr, 'string']],
	'header_GetComment': ['string', [voidPtr]],
	'header_SetComment': [voidPtr, [voidPtr, 'string']],
	'nodeDefinition_GetNumberOfOutcomes': ['int', [voidPtr]],
	'CalcProbEvidence': ['double', [voidPtr]],
	'nodeValue_SetEvidence': ['void', [voidPtr, 'int']],
	'nodeDefinition_GetOutcomesNames': [voidPtr, [voidPtr]],
	'nodeDefinition_SetDoubleDefinition': ['void', [voidPtr, 'int', voidPtr]],
	'stringArray_Items': [ref.refType(ref.types.CString), [voidPtr]],
	'GetDefaultBNAlgorithm': ['int', [voidPtr]],
	'SetDefaultBNAlgorithm': ['void', [voidPtr, 'int']],
	'ClearAllEvidence': ['void', [voidPtr]],
	'nodeValue_ClearEvidence': ['void', [voidPtr]],
	'nodeValue_GetVirtualEvidence': [ref.refType(ref.types.double), [voidPtr]],
	'nodeValue_SetVirtualEvidence': ['void', [voidPtr, 'int', voidPtr]],
	'nodeDefinition_AddOutcome': ['void', [voidPtr, 'string']],
	'nodeDefinition_RenameOutcomes': ['void', [voidPtr, 'int', voidPtr]],
	'GetParents': [voidPtr, [voidPtr, 'int']],
	'new_intArray': [voidPtr, []],
	'GetAllNodes': ['void', [voidPtr, voidPtr]],
	'AddArc': ['void', [voidPtr, 'int', 'int']],
	'RemoveArc': ['void', [voidPtr, 'int', 'int']],
	'WriteFile': ['void', [voidPtr, 'string']],
});

class Net {
	constructor(fn = null) {
		this.eNet = g.new_network();
		this._autoUpdate = true;

		if (fn) {
			if (fs.existsSync(fn)) {
				g.ReadFile(this.eNet, fn);
				if (/\.dne$/.test(fn)) {
					// Fix up probs that GeNIe has with reading new Netica (>= V4) files
					let contents = fs.readFileSync(fn).toString();
					// Strip out strings and comments (makes scanning for keywords simpler)
					// Strip out strings
					contents = contents.replace(/"(\\\\|\\"|[^"])*?"/g, '');
					// Strip out comments
					contents = contents.replace(/\/\/.*/g, '');
					// Scan for nodes and their CPTs
					let reg = /\b(node)\s+(\w+)\s*\{|\b(probs)\s*=([^;]*)/g;
					let currentNode = null;
					while (1) {
						let m = reg.exec(contents);
						if (m) {
							if (m[1]=="node") {
								currentNode = m[2];
							}
							else if (m[3]=="probs") {
								let cptStr = m[4];
								// Flatten to 1D by splitting on commas/parentheses/spaces (any non-numeral symbol)
								cptStr = cptStr.replace(/^[(), \t\r\n]+|[(), \t\r\n]+$/g, '');
								let cptStrs = cptStr.split(/[(),\s]+/);
								// Convert to floats
								let cpt = cptStrs.map(v => parseFloat(v));
								// Update the in-memory CPT
								this.node(currentNode).cpt1d(cpt);
							}
						}
						else {
							break;
						}
					}
				}
			}
			else {
				throw new Error(`File not found: ${fn}.`)
			}
		}
	}
	
	/// Replace with makeValidName
	makeValidId(id, check = true) {
		var IDREGEX = /([_a-zA-Z])([_0-9a-zA-Z]{0,29})/; /// NOTE: Not anchored at start,end
		function makeId(str) {
			try {
				return str.replace(/[^_0-9a-zA-Z]/g, '_').replace(/^[^_a-zA-Z]/, '_$&').substr(0, 30);
			} catch(e) { return null; }
		}
		
		let hasNode = true;
		let newId = makeId(id);
		
		if (check) {
			let i = 1;
			while (hasNode) {
				if (!this.node(newId)) {
					hasNode = false;
				}
				else {
					newId = newId.slice(0, 30-(i+"").length) + (i+"");
				}
				i++;
				if (i > 1000)  return null;
			}
		}
		
		return newId;
	}

	close() {
		g.delete_network(this.eNet);
	}

	write(fn) {
		g.WriteFile(this.eNet, fn);
	}

	// Engine dependent
	updateAlgorithm(algorithm = null) {
		if (algorithm === null) {
			return g.GetDefaultBNAlgorithm(this.eNet);
		}
		else {
			g.SetDefaultBNAlgorithm(this.eNet, algorithm);
		}
	}

	autoUpdate(autoUpdate = null) {
		if (this.autoUpdate === null) {
			return this.autoUpdate;
		}
		else {
			this._autoUpdate = autoUpdate;
		}

		return this;
	}

	update() {
		g.UpdateBeliefs(this.eNet);
	}

	name(_name = null) {
		let header = g.net_Header(this.eNet);
		if (_name === null) {
			return g.header_GetId(header);
		}
		else {
			g.header_SetId(header, _name);
		}

		return this;
	}

	title(_title = null) {
		let header = g.net_Header(this.eNet);
		if (_title === null) {
			return g.header_GetName(header);
		}
		else {
			g.header_SetName(header, _title);
		}

		return this;
	}

	addNode(name, nodeType = null, states = null) {
		let node = null;
		try {
			node = new Node(this, name, states, nodeType);
		}
		catch (e) {
			return null;
		}
		
		return node;
	}

	nodes() {
		let intArray = g.new_intArray();
		g.GetAllNodes(this.eNet, intArray);
		let numItems = g.intArray_NumItems(intArray);
		let items = pointerAsArray(g.intArray_Items(intArray), ref.types.int, numItems);

		return Array.from(items).map(eId => new Node(this,null,null,null,eId));
	}

	compile() {
		// No compile phase in GeNIe. Might do something in future.
	}

	retractFindings() {
		g.ClearAllEvidence(this.eNet);
	}

	node(name) {
		let nodeId = g.FindNode(this.eNet, name);
		if (nodeId == -2) {
			return null;
		}
		return new Node(this, null, null, null, nodeId);
	}

	findingsProbability() {
		return g.CalcProbEvidence(this.eNet);
	}

	static numberCombinations(nodes) {
		if (nodes.length == 0)  return 0;

		return nodes.reduce((a,v) => a*v.numberStates(), 1);
	}

	static nextCombination(nodeStates, nodes, skip = []) {
		skip = new Set(skip);

		let numNodes = nodeStates.length;
		for (let i=numNodes-1; i >= 0; i--) {
			if (skip.has(i))  continue;

			nodeStates[i] += 1;
			if (nodeStates[i] >= nodes[i].numberStates()) {
				/// Set the i^th node state to 0 and continue to next node
				nodeStates[i] = 0;
			}
			else {
				/// More combinations to come
				return true;
			}
		}
		/// All node states have rolled back round to 0
		return false;
	}
}

class Node {
	constructor(net = null, name = null, states = null, nodeType = null, genieNodeId = null) {
		this.net = net;
		this.eId = genieNodeId;
		this._states = null;
		this._stateNames = null;
		this._statesLookup = null;
		if (name !== null) {
			if (!this.checkValidName(name)) {
				throw new Error("Node name "+name+" is not valid. Must have " +
					"first character as letter/underscore, "+
					"other characters as letter/number/underscore and max. 30 characters");
			}
			if (nodeType === null)  nodeType = Node.NATURE_NODE;
			this.eId = g.AddNode(this.net.eNet, Node.NODE_TYPE_MAP[nodeType], name);
			if (this.eId == -2) {
				throw new Error('Failed to create node');
			}
		}

		if (states) {
			this.renameStates(states);
			for (let i=2; i<states.length; i++) {
				this.addState(states[i]);
			}
		}
	}

	_gNode() {
		return g.GetNode(this.net.eNet, this.eId);
	}

	_gNodeHdr() {
		let nodeInfoPtr = g.node_Info(this._gNode());
		let headerPtr = g.nodeInfo_Header(nodeInfoPtr);
		return headerPtr;
	}

	_gNodeDef() {
		return g.node_Definition(this._gNode());
	}

	_gNodeVal() {
		return g.node_Value(this._gNode());
	}
	
	delete() {
		g.DeleteNode(this.net.eNet, this.eId);
		
		return null;
	}

	checkValidName(name) {
		return /[a-zA-Z_][a-zA-Z0-9_]{0,29}/.test(name);
	}

	name(_name = null) {
		let header = this._gNodeHdr();
		if (_name === null) {
			return g.header_GetId(header);
		}
		else {
			g.header_SetId(header, _name);
		}

		return this;
	}

	title(_title = null) {
		let header = this._gNodeHdr();
		if (_title === null) {
			return g.header_GetName(header);
		}
		else {
			g.header_SetName(header, _title);
		}

		return this;
	}
	
	comment(_comment = null) {
		let header = this._gNodeHdr();
		if (_comment === null) {
			return g.header_GetComment(header);
		}
		else {
			g.header_SetComment(header, _comment);
		}

		return this;
	}

	parents() {
		let parentIds = g.GetParents(this.net.eNet, this.eId);
		let numItems = g.intArray_NumItems(parentIds);
		let parentIdItems = pointerAsArray(g.intArray_Items(parentIds), ref.types.int, numItems);
		let parents = Array.from(parentIdItems).map(pId => new Node(this.net, null, null, null, pId));

		return parents;
	}

	children() {
		let allNodes = this.net.nodes();
		let children = [];
		for (let node of allNodes) {
			if (node.parents().find(p => p.name()==this.name())) {
				children.push(node);
			}
		}
		return children;
	}

	addParents(parents) {
		/// Each element of parents can be an existing node name or node.
		for (let parent of parents) {
			/// Make sure each parent is a Node object
			if (typeof(parent)=='string') {
				parent = this.net.node(parent);
			}
			g.AddArc(this.net.eNet, parent.eId, this.eId);
		}

		/// Chain
		return this;
	}

	addChildren(children) {
		/// Each element of child can be an existing node name or node.
		for (let child of children) {
			/// Make sure each child is a Node object
			if (typeof(child)=='string') {
				child = this.net.node(child);
			}
			g.AddArc(this.net.eNet, this.eId, child.eId);
		}

		/// Chain
		return this;
	}
	
	removeParents(parents) {
		for (let parent of parents) {
			g.RemoveArc(this.net.eNet, parent.eId, this.eId);
		}
		
		/// Chain
		return this;
	}

	removeChildren(children) {
		for (let child of children) {
			g.RemoveArc(this.net.eNet, this.eId, child.eId);
		}
		
		/// Chain
		return this;
	}

	addState(name) {
		let nodeDef = this._gNodeDef();
		g.nodeDefinition_AddOutcome(nodeDef, name);

		// Chain
		return this;
	}

	renameState(name, newName) {
		let nodeDef = this._gNodeDef();
		let stateNames = this.stateNames();
		let state = this.state(name);

		stateNames[state.stateNum] = newName;
		let stateNamesArg = ArrayType(ref.types.CString, stateNames.length)(stateNames);

		g.nodeDefinition_RenameOutcomes(nodeDef, stateNamesArg.length, stateNamesArg.buffer);

		/// Chain
		return this;
	}

	renameStates(newNames) {
		let nodeDef = this._gNodeDef();

		let stateNamesArg = ArrayType(ref.types.CString, newNames.length)(newNames);

		g.nodeDefinition_RenameOutcomes(nodeDef, stateNamesArg.length, stateNamesArg.buffer);

		/// Chain
		return this;
	}

	numberStates() {
		let nodeDef = this._gNodeDef();
		return g.nodeDefinition_GetNumberOfOutcomes(nodeDef);
	}

	_setupStates(force = false) {
		if (!force && this._stateNames)  return;

		this._stateNames = this.stateNames();
		this._statesLookup = Object.fromEntries(this._stateNames.map((k,i) => [k,new State(this, i)]));
		this._states = [];
		for (let stateName of this._stateNames) {
			this._states.push(this._statesLookup[stateName]);
		}
	}

	stateNames() {
		/*let nodeDef = this._gNodeDef();
		console.log('x');
		let stateNameArray = g.nodeDefinition_GetOutcomesNames(nodeDef);
		console.log('y');
		try {
		let numStates = this.numberStates();
		let charStarStar = pointerAsArray(g.stringArray_Items(stateNameArray), ref.types.CString, numStates);
		console.log('z', numStates);

		let stateNames = [];
		for (let i=0; i<numStates; i++) {
			stateNames.push(charStarStar[i]);
		}
		} catch(e){}
		return [];
		*/
		let nodeDef = this._gNodeDef();
		let stateNameArray = g.nodeDefinition_GetOutcomesNames(nodeDef);
		let numStates = this.numberStates();
		let charStarStar = pointerAsArray(g.stringArray_Items(stateNameArray), ref.types.CString, numStates);

		let stateNames = [];
		for (let i=0; i<numStates; i++) {
			stateNames.push(charStarStar[i]);
		}
		return stateNames;
	}

	state(name) {
		this._setupStates();

		if (typeof(name)!="string") {
			return this._states[name];
		}

		return this._statesLookup[name];
	}

	states() {
		this._setupStates();

		return this._states;
	}

	hasState(name) {
		this._setupStates();

		return this._states.includes(state);
	}

	finding(state) {
		this.state(state).setTrueFinding();
	}

	likelihoods(likelihoodVector = null) {
		if (likelihoodVector === null) {
			let evArr = g.nodeValue_GetVirtualEvidence(this._gNodeVal());
			let size = ref.get(evArr,0);
			if (size) {
				evArr = pointerAsArray(evArr, ref.types.double, size+1);
				return Array.from(evArr).slice(1);
			}
			return null;
		}
		else {
			let n = likelihoodVector.length;
			let dp = ArrayType(ref.types.double, n)(likelihoodVector, n);
			g.nodeValue_SetVirtualEvidence(this._gNodeVal(), n, dp.buffer);
		}
	}

	retractFindings() {
		let gNodeVal = this._gNodeVal();
		
		return g.nodeValue_ClearEvidence(gNodeVal);
	}
		
	beliefs() {
		if (this.net._autoUpdate)  this.net.update();

		let gNodeValue = this._gNodeVal();
		let gMat = g.nodeValue_GetMatrix(gNodeValue);

		let gSize = g.dMatrix_GetSize(gMat);
		let gDbl = pointerAsArray(g.dMatrix_GetItemsDouble(gMat), ref.types.double, gSize);
		let beliefs = [];

		for (let i=0; i<gSize; i++) {
			beliefs.push(gDbl[i]);
		}

		return beliefs;
	}

	cpt1d(newCpt = null) {
		if (newCpt === null) {
			let nodeDef = this._gNodeDef();
			let nodeMat = g.nodeDefinition_GetMatrix(nodeDef);
			let numItems = g.dMatrix_GetSize(nodeMat);

			let cptDbl = [];
			let dbArr = pointerAsArray(g.dMatrix_GetItemsDouble(nodeMat), ref.types.double, numItems);

			for (let i=0; i<numItems; i++) {
				cptDbl.push(dbArr[i]);
			}

			return cptDbl;
		}
		else {
			let nodeDef = this._gNodeDef();
			let numStates = this.numberStates();

			let totalParams = newCpt.length;
			let rows = Math.floor(totalParams/numStates);

			// Normalisation
			for (let r=0; r<rows.length; r++) {
				r *= numStates;
				let totalRow = newCpt.slice(r, r+numStates).reduce((a,v) => a+v);
				if (totalRow) {
					for (let i=r; i<r+numStates; r++) {
						newCpt[i] = newCpt[i]/totalRow;
					}
				}
			}

			let newCptData = ArrayType(ref.types.double, newCpt.length)(newCpt, newCpt.length);
			g.nodeDefinition_SetDoubleDefinition(nodeDef, newCpt.length, newCptData.buffer);
		}

		return this;
	}

	cpt(newCpt = null) {
		if (newCpt === null) {
			let cpt1d = this.cpt1d();
			let numStates = this.numberStates();

			let cpt = Array(cpt1d.length/numStates).fill().map((v,i) => cpt1d.slice(i*numStates, i*numStates+numStates));

			return cpt;
		}
		else {
			let nodeDef = this._gNodeDef();
			let numStates = this.numberStates();

			let totalParams = newCpt.length;
			let rows = totalParams/numStates;

			// Normalisation
			let newCpt2 = [];
			for (let row of newCpt) {
				let totalRow = row.reduce((a,v) => a+v);
				if (totalRow) {
					for (let i=0; i<row.length; i++) {
						row[i] = row[i]/totalRow;
					}
				}
				newCpt2.push(...row);
			}

			let nc = ArrayType(ref.types.double, newCpt2.length)(newCpt2);

			g.nodeDefinition_SetDoubleDefinition(nodeDef, nc.length, nc.buffer);
		}

		// Chain
		return this;
	}

	position(x = null, y = null) {
		let node = this._gNode();
		let nodeInfo = g.node_Info(node);
		let screenInfo = g.nodeInfo_Screen(nodeInfo);
		let position = g.screenInfo_position(screenInfo);
		if (x !== null) {
			g.rectangle_center_X_set(position, x);
		}
		if (y !== null) {
			g.rectangle_center_Y_set(position, y);
		}
		if (x === null && y === null) {
			return [g.rectangle_center_X(position), g.rectangle_center_Y(position)];
		}
		return this;
	}

	size(width = null, height = null) {
		let node = this._gNode();
		let nodeInfo = g.node_Info(node);
		let screenInfo = g.nodeInfo_Screen(nodeInfo);
		let position = g.screenInfo_position(screenInfo);
		if (width !== null) {
			g.rectangle_width_set(position, width);
		}
		if (height !== null) {
			g.rectangle_height_set(position, height);
		}
		if (width === null && height === null) {
			return [g.rectangle_width(position), g.rectangle_height(position)];
		}
		return this;
	}
}

class State {
	constructor(node = null, stateNum = null) {
		this.node = node;
		this.stateNum = stateNum;
	}

	name(_name = null) {
		if (_name === null) {
			this.node._setupStates();

			return this.node._stateNames[this.stateNum];
		}
		else {
			this.node.renameState(this.stateNum, _name);

			this.node._setupStates(true);

			return this;
		}
	}

	title(_title = null) {
		console.log('NYI');
	}

	setTrueFinding() {
		let gNodeValue = this.node._gNodeVal();
		g.nodeValue_SetEvidence(gNodeValue, this.stateNum);
	}
}

/// Set node types (as per Netica)
`NATURE_NODE CONSTANT_NODE DECISION_NODE
UTILITY_NODE DISCONNECTED_NODE EQUATION_NODE`.split(/\s+/).forEach((prop,i) => Node[prop] = i+1);

/// Node type map for SMILE
Node.NODE_TYPE_MAP = {
	[Node.NATURE_NODE]: 18,
	[Node.EQUATION_NODE]: 4,
	[Node.UTILITY_NODE]: 8,
	[Node.DECISION_NODE]: 17,
};

`ALG_BN_LAURITZEN ALG_BN_HENRION ALG_BN_PEARL ALG_BN_LSAMPLING
ALG_BN_SELFIMPORTANCE ALG_BN_HEURISTICIMPORTANCE ALG_BN_BACKSAMPLING
ALG_BN_AISSAMPLING ALG_BN_EPISSAMPLING ALG_BN_LBP ALG_BN_LAURITZEN_OLD
ALG_BN_RELEVANCEDECOMP ALG_BN_RELEVANCEDECOMP2 ALG_HBN_HEPIS ALG_HBN_HLW
ALG_HBN_HLBP ALG_HBN_HLOGICSAMPLING`.split(/\s+/).forEach((prop,i) => Net[prop] = i);


exports.Net = Net;
exports.Node = Node;
exports.State = State;