/// The napi versions are meant to be node version independent. Since ffi/ref/etc. aren't
/// updated promptly, the napi versions should be much more stable.
var ffi = require('ffi-napi');
var ref = require('ref-napi');
var ArrayType = require('ref-array-di')(ref);
var fs = require('fs');

var voidPtr = ref.refType(ref.types.void);
/** This took forever to discover! Use it to take returned pointer arrays
	and convert them into JS arrays of the given size. e.g.
	C: double* somefunc();
	JS: pointerAsArray(<ffi.Library>.somefunc(), ref.types.double, 10)
	
	<sigh> Not working in ffi-napi 3.0.1
**/
function pointerAsArray(ptr, type, size) {
	//console.log('ptr', ptr, type.size, size, type.size*size);
	//console.time('reint');
	let buf = ref.reinterpret(ptr, type.size*size);
	//console.timeEnd('reint');
	//console.time('at');
	if (type == ref.types.double) {
		return new Float64Array(buf.buffer);
	}
	else if (type == ref.types.int) {
		return new Int32Array(buf.buffer);
	}
	let at = ArrayType(type)(buf, size);
	//console.timeEnd('at');
	return at;
}

/*var g = ffi.Library('bismile64', {
	'new_network': [voidPtr, []],
	'copy_network': [voidPtr, [voidPtr]],
	'delete_network': [voidPtr, [voidPtr]],
	'UpdateBeliefs': [ref.types.void, [voidPtr]],
	'ReadFile': [ref.types.void, [voidPtr, 'string']],
	'AddNode': ['int', [voidPtr, 'int', 'string']],
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
	'nodeValue_IsRealEvidence': ['int', [voidPtr]],
	'nodeValue_GetEvidence': ['int', [voidPtr]],
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
	'nodeDefinition_SetNumberOfOutcomes': ['int', [voidPtr, 'int']],
	'nodeDefinition_SetNumberOfOutcomesStr': ['int', [voidPtr, 'int', voidPtr]],
	'nodeDefinition_RenameOutcomes': ['void', [voidPtr, 'int', voidPtr]],
	'GetParents': [voidPtr, [voidPtr, 'int']],
	'new_intArray': [voidPtr, []],
	'GetAllNodes': ['void', [voidPtr, voidPtr]],
	'AddArc': ['int', [voidPtr, 'int', 'int']],
	'RemoveArc': ['void', [voidPtr, 'int', 'int']],
	'WriteFile': ['void', [voidPtr, 'string']],
});*/

var _definitions;
var _g;
var g = new Proxy({}, {
	_definitions: _definitions = {
		'new_network': [voidPtr, []],
		'copy_network': [voidPtr, [voidPtr]],
		'delete_network': [voidPtr, [voidPtr]],
		'UpdateBeliefs': [ref.types.void, [voidPtr]],
		'ReadFile': [ref.types.void, [voidPtr, 'string']],
		'AddNode': ['int', [voidPtr, 'int', 'string']],
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
		'nodeValue_IsRealEvidence': ['int', [voidPtr]],
		'nodeValue_GetEvidence': ['int', [voidPtr]],
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
		'nodeDefinition_SetNumberOfOutcomes': ['int', [voidPtr, 'int']],
		'nodeDefinition_SetNumberOfOutcomesStr': ['int', [voidPtr, 'int', voidPtr]],
		'nodeDefinition_RenameOutcomes': ['void', [voidPtr, 'int', voidPtr]],
		'GetParents': [voidPtr, [voidPtr, 'int']],
		'new_intArray': [voidPtr, []],
		'GetAllNodes': ['void', [voidPtr, voidPtr]],
		'AddArc': ['int', [voidPtr, 'int', 'int']],
		'RemoveArc': ['void', [voidPtr, 'int', 'int']],
		'WriteFile': ['void', [voidPtr, 'string']],
	},
	g: _g = (_=>{
		try {
			return ffi.Library('bismile64', Object.assign({},_definitions));
		}
		catch (e) {
			return ffi.Library('./libbismile.so', Object.assign({},_definitions));
		}
	})(),
	get(target, prop) {
		if (!this._definitions[prop]) {
			throw new Error(`"${prop}" function not defined for this API`);
		}
		return new Proxy(this.g[prop], {
			apply: (target, thisArg, argList) => {
				let argTypes = this._definitions[prop][1];
				/*if (prop == 'AddNode') {
					console.log('hello',argTypes, argList);
				}*/
				for (let i=0; i<argTypes.length; i++) {
					if (['int','float','double','string'].includes(argTypes[i])
							&& (typeof(argList[i])=='undefined' || typeof(argList[i])=='object')) {
						//if (prop =='AddNode')console.log(argList[i], argTypes[i], typeof(argList[i]));
						throw new Error(`Wrong type in "${prop}" for argument ${i}`);
					}
				}
				return target.apply(thisArg, argList);
			}
		});
	}
});

//g = _g;

class Net {
	constructor(fn = null) {
		/// Reading from file is orders of magnitude faster than copying. Don't copy...
		this.eNet = g.new_network();
		this._autoUpdate = true;
		
		this.needsUpdate = true;
		this.forceUpdates = false;

		// Caches
		this._nodeCache = {};
	
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
								console.log(currentNode);
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
	
	/*get needsUpdate() {
		return this._needsUpdate;
	}
	
	set needsUpdate(_needsUpdate) {
		if (_needsUpdate) {
			console.trace();
		}
		this._needsUpdate = _needsUpdate;
	}*/
	
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
	
	/// Lots of limitations. Basic BNs only
	clone() {
		let newNet = new Net();
		newNet.autoUpdate(false);
		console.time('in');
		let s = 0;
		for (let node of this.nodes()) {
			newNet.addNode(node.name(), null, node.stateNames());
			s += node.states().length;
		}
		console.log({s});
		console.timeEnd('in');
		console.time('out');
		for (let node of this.nodes()) {
			let newNode = newNet.node(node.name());
			newNode.addParents(node.parents().map(p => p.name()));
			newNode.cpt1d(node.cpt1d());
			newNode.position(...node.position());
			newNode.size(...node.size());
		}
		console.timeEnd('out');
		
		newNet.autoUpdate(true);
		
		return newNet;
	}

	// Engine dependent
	updateAlgorithm(algorithm = null) {
		if (algorithm === null) {
			return g.GetDefaultBNAlgorithm(this.eNet);
		}
		else {
			g.SetDefaultBNAlgorithm(this.eNet, algorithm);
		}
		this.needsUpdate = true;
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

	update(forceUpdates) {
		if (this.needsUpdate || forceUpdates || this.forceUpdates) {
			g.UpdateBeliefs(this.eNet);
			this.needsUpdate = false;
		}
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

	/// Be careful, because states is the 3rd arg.
	addNode(name, nodeType = null, states = null) {
		let node = null;
		try {
			node = new Node(this, name, states, nodeType);
			this.needsUpdate = true;
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
		this.needsUpdate = true;
	}

	findings(findings = null) {
		if (findings === null) {
			findings = {}
			for (let node of this.nodes()) {
				findings[node.name()] = node.finding();
			}
			
			return findings;
		}
		else {
			for (let [nodeName,finding] of Object.entries(findings)) {
				if (finding === null) {
					this.node(nodeName).retractFindings()
				}
				else {
					this.node(nodeName).finding(finding)
				}
			}
		}
		
		return this
	}
	
	node(name) {
		if (name in this._nodeCache)  return this._nodeCache[name];
		
		let nodeId = g.FindNode(this.eNet, name);
		if (nodeId == -2) {
			return null;
		}
		this._nodeCache[name] = new Node(this, null, null, null, nodeId);
		
		return this._nodeCache[name];
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
	
	/// Get MI against all other nodes for (for now) a single node
	mi(targetNode, o = {}) {
		o.targetStates = !o.targetStates ? [] : o.targetStates;
		o.otherStates = !o.otherStates ? {} : o.otherStates;
		
		let net = this;
		//let savedAutoUpdate = net._autoUpdate;
		//net._autoUpdate = false;
		console.time('mi func');
		
		// Get marginals (with whatever current evidence is)
		let marginals = {}
		console.timeLog('mi func');
		//net.nodes()[0].states()[0].setTrueFinding();
		//net.nodes()[0].retractFindings()
		for (let node of net.nodes()) {
			//onsole.log(`${node.name()}: ${node.cpt1d()}`);
			marginals[node.name()] = node.beliefs()
		}
		//onsole.log({marginals});
		
		// Store all node beliefs for every different state in target
		let beliefsByTargetState = []
		// print('b', time.time() - t)
		console.timeLog('mi func');
		//onsole.log({findings: net.findings()});
		for (let state of targetNode.states()) {
			state.setTrueFinding()
			let beliefs = {}
			for (let node of net.nodes()) {
				// The below is wrong, as it requires the marginals to be recomputed as well
				// if node.name() != targetNode.name() and node.hasFinding():
					// saved = node.finding()
					// node.retractFindings()
					// beliefs[node.name()] = node.beliefs()
					// node.finding(saved)
				// else:
					// beliefs[node.name()] = node.beliefs()
				beliefs[node.name()] = node.beliefs()
			}
			beliefsByTargetState.push(beliefs)
		}
		//onsole.log(JSON.stringify({beliefsByTargetState},null,'\t'));
		// print('c', time.time() - t)
		console.timeLog('mi func');
		targetNode.retractFindings()
		
		// Now, calculate the MI table
		let miTable = []
		let targetMarginals = marginals[targetNode.name()]
		let targetCondProbs = {}
		let targetStateNums = new Set(o.targetStates.map(s => targetNode.state(s).stateNum));
		for (let node of net.nodes()) {
			// joint * log ( joint / marginals)
			// For each prob in target marginal
			let total = 0
			targetCondProbs[node.name()] = node.states().map(s => targetNode.states().map(_=>0))
			//console.log('otherstates:',o.otherStates);
			let otherStates = o.otherStates[node.name()] || [];
			let otherStateNums = new Set(otherStates.map(s => node.state(s).stateNum));
			for (let [i,targetMarginalProb] of targetMarginals.entries()) {
				/// Skip targetState if not matching
				//onsole.log('stsinm', o.targetState, targetNode.state(i).name());
				if (targetStateNums.size && !targetStateNums.has(targetNode.state(i).stateNum))  continue;
				let nodeMarginal = marginals[node.name()]
				// And each prob in both marginal and conditional node beliefs
				for (let [j,nodeProb] of beliefsByTargetState[i][node.name()].entries()) {
					/// Skip otherState if not matching
					//onsole.log('soinm', o.otherState, node.state(j).name());
					if (otherStateNums.size && !otherStateNums.has(node.state(j).stateNum))  continue;
					let jointProb = targetMarginalProb*nodeProb
					let nodeMarginalProb = nodeMarginal[j]
					let targetCondProb;
					
					if (jointProb * targetMarginalProb * nodeMarginalProb != 0) {
						//onsole.log(node.name(), jointProb, targetMarginalProb, nodeMarginalProb)
						total += jointProb * Math.log2( jointProb / (targetMarginalProb * nodeMarginalProb) )
						
						targetCondProb = jointProb / nodeMarginalProb
					}
					else {
						targetCondProb = 0
					}
					
					targetCondProbs[node.name()][j][i] = targetCondProb
				}
			}
			
			/// Need to be asymmetric to support Causal MI
			/// We assume the target is the effect, hence others are the cause
			/// Then we divide it out, because it was in the joint, and shouldn't have been there for these cases
			let margSum = 0;
			for (let otherStateNum of otherStateNums) {
				margSum += marginals[node.name()][otherStateNum];
			}
			if (margSum) {
				total /= margSum;
			}
			
			let minExpRank = 10000000
			let maxExpRank = -1
			let minExpRankJ = -1
			let maxExpRankJ = -1
			for (let [j,row] of targetCondProbs[node.name()].entries()) {
				let expRank = row.map((p,i) => i*p).reduce((a,v)=>a+v)
				//expRank = sum(i*p for i,p in enumerate(row))
				if (expRank < minExpRank) {
					minExpRank = expRank
					minExpRankJ = j
				}
				if (expRank > maxExpRank) {
					maxExpRank = expRank
					maxExpRankJ = j
				}
			}
			miTable.push([node.name(), total, maxExpRank-minExpRank, minExpRankJ, maxExpRankJ])
		}
		console.timeEnd('mi func');
		
		//net._autoUpdate = savedAutoUpdate;
		
		//onsole.log(miTable);
		
		//print(json.dumps(targetCondProbs, indent='\t'))
		
		//return sorted(miTable, key = lambda x: x[1], reverse=True)
		return miTable
	}
}

class Node {
	constructor(net = null, name = null, states = null, nodeType = null, genieNodeId = null) {
		this.net = net;
		this.eId = genieNodeId;
		this._nodeObjCache = null;
		this._nodeHdrCache = null;
		this._nodeDefCache = null;
		// nyi
		// self._nodeValCache = None
		// self._nodeInfoCache = None
		// self._screenInfoCache = None
		// self._equationCache = {}

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
			//let nodeDef = this._gNodeDef();
			//console.log(nodeDef);
			g.nodeDefinition_SetNumberOfOutcomes(this._gNodeDef(), states.length);
			//console.log(this.states());
			this.renameStates(states);
			/*for (let i=2; i<states.length; i++) {
				console.timeLog('rename');
				this.addState(states[i]);
			}*/
		}
		if (genieNodeId === null) {
			this.net.needsUpdate = true;
		}
	}

	_gNode() {
		if (this._nodeObjCache !== null)  return this._nodeObjCache;
		this._nodeObjCache = g.GetNode(this.net.eNet, this.eId);
		return this._nodeObjCache;
	}

	_gNodeHdr() {
		if (this._nodeHdrCache !== null) return this._nodeHdrCache;
		// Not sure why it's so buried away in GeNIe
		let myNodePtr = g.GetNode(this.net.eNet, this.eId);
		let nodeInfoPtr = g.node_Info(myNodePtr);
		let headerPtr = g.nodeInfo_Header(nodeInfoPtr);
		this._nodeHdrCache = headerPtr;
		return headerPtr;
	}

	_gNodeDef() {
		if (this._nodeDefCache !== null) return this._nodeDefCache;
		let nodePtr = this._gNode();
		this._nodeDefCache = g.node_Definition(nodePtr);
		return this._nodeDefCache;
	}

	_gNodeVal() {
		return g.node_Value(this._gNode());
	}
	
	delete() {
		if (this.name() in this.net._nodeCache) {
			delete this.net._nodeCache[this.name()];
		}
		g.DeleteNode(this.net.eNet, this.eId);
		this.net.needsUpdate = true;
		
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
			let oldName = this.name();
			g.header_SetId(header, _name);
			if (oldName in this.net._nodeCache) {
				this.net._nodeCache[name] = this.net._nodeCache[oldName];
				delete this.net._nodeCache[oldName];
			}
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
			console.log(parent.eId, this.eId);
			g.AddArc(this.net.eNet, parent.eId, this.eId);
			console.log('x');
		}

		/// Chain
		this.net.needsUpdate = true;
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
		this.net.needsUpdate = true;
		return this;
	}
	
	removeParents(parents) {
		for (let parent of parents) {
			g.RemoveArc(this.net.eNet, parent.eId, this.eId);
		}
		
		/// Chain
		this.net.needsUpdate = true;
		return this;
	}

	removeChildren(children) {
		for (let child of children) {
			g.RemoveArc(this.net.eNet, this.eId, child.eId);
		}
		
		/// Chain
		this.net.needsUpdate = true;
		return this;
	}

	addState(name) {
		let nodeDef = this._gNodeDef();
		g.nodeDefinition_AddOutcome(nodeDef, name);

		// Chain
		this.net.needsUpdate = true;
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

		if (name instanceof State) {
			name = name.name()
		}
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

	hasFinding() {
		let gNodeValue = this._gNodeVal()
		
		return !!(g.nodeValue_IsRealEvidence(gNodeValue))
	}
	
	finding(state = null) {
		if (state === null) {
			if (this.hasFinding()) {
				let gNodeValue = this._gNodeVal()
				return this.state(g.nodeValue_GetEvidence(gNodeValue))
			}
			else {
				return null
			}
		}
		else {
			this.state(state).setTrueFinding()
			this.net.needsUpdate = true
		}
		
		return this
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
			this.net.needsUpdate = true;
		}
	}

	retractFindings() {
		let gNodeVal = this._gNodeVal();
		
		this.net.needsUpdate = true;
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
			//console.time('ptr');
			/*let dbArr = pointerAsArray(g.dMatrix_GetItemsDouble(nodeMat), ref.types.double, numItems);

			for (let i=0; i<numItems; i++) {
				cptDbl.push(dbArr[i]);
			}*/
			
			let ptr = g.dMatrix_GetItemsDouble(nodeMat);
			//console.log(ptr, ptr.length);
			let buf = ref.reinterpret(ptr, ref.types.double.size*numItems);
			let nums = new Float64Array(buf.buffer);
			/*console.log(buf, buf.length, );
			console.log(Array.isArray(buf));*/
			for (let i=0; i<numItems; i++) {
				cptDbl.push(nums[i]);
			}
			//console.timeEnd('ptr');

			return cptDbl;
		}
		else {
			let nodeDef = this._gNodeDef();
			let numStates = this.numberStates();

			let totalParams = newCpt.length;
			let rows = Math.floor(totalParams/numStates);
			
			newCpt =  new Float64Array(newCpt);

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

			//let newCptData = ArrayType(ref.types.double, newCpt.length)(newCpt, newCpt.length);
			g.nodeDefinition_SetDoubleDefinition(nodeDef, newCpt.length, newCpt);
			this.net.needsUpdate = true;
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
			this.net.needsUpdate = true;
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
	
	/// Get entropy
	entropy() {
		let bel = this.beliefs();
		return bel.map(p => -p*Math.log2(p)).reduce((a,v)=>a+v);
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
		this.node.net.needsUpdate = true;
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