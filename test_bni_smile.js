var {Net, Node} = require('./bni_smile');
var netsDir = "nets/";

function mainTests() {
	console.log("[Open NF_V1.dne]");
	let myNet = new Net(netsDir + "NF_V1.dne");
	console.log();

	console.log("[Call close() garbage collect]");
	myNet.close();

	console.log("[Re-open NF_V1.dne]");
	myNet = new Net(netsDir+"NF_V1.dne");
	console.log();

	console.log("Net name:", myNet.name())
	console.log("[Change name to NFAV1]")
	myNet.name("NFAV1")
	console.log("Check new net name:", myNet.name())
	console.log()

	console.log("Net title:", myNet.title())
	console.log("[Change title to 'Native Fish A V1']")
	myNet.title("Native Fish A V1")
	console.log("Check new net title:", myNet.title())
	console.log()

	console.log("[Get RiverFlow node]")
	let rf = myNet.node("RiverFlow")
	console.log(rf)

	console.log("RiverFlow number states:", rf.numberStates())
	console.log("RiverFlow node beliefs:", rf.beliefs())
	console.log("FishAbundance node beliefs:", myNet.node("FishAbundance").beliefs())
	console.log("P(All Evidence):", myNet.findingsProbability())
	console.log()

	console.log("[States of RiverFlow]");
	console.log(rf.stateNames());

	console.log("[Set RiverFlow = state0]");
	rf.finding(0);
	console.log("RiverFlow node beliefs|RiverFlow=state0:", rf.beliefs());
	console.log("FishAbundance node beliefs|RiverFlow=state0:", myNet.node("FishAbundance").beliefs());
	console.log("New P(Evidence):", myNet.findingsProbability());
	console.log();

	console.log(Net.ALG_BN_LSAMPLING);
	
	console.log("[Use likelihood sampling; then set RiverFlow = state0]")
	prevAlgorithm = myNet.updateAlgorithm()
	console.log("Previous algorithm:", prevAlgorithm)
	myNet.updateAlgorithm(Net.ALG_BN_LSAMPLING)
	console.log("Algorithm set to:", myNet.updateAlgorithm())
	rf.finding(0)
	console.log("RiverFlow node beliefs|RiverFlow=state0:", rf.beliefs())
	console.log("FishAbundance node beliefs|RiverFlow=state0:", myNet.node("FishAbundance").beliefs())
	console.log("New P(Evidence):", myNet.findingsProbability())
	console.log()
	myNet.updateAlgorithm(prevAlgorithm)

	console.log("[Clear findings]")
	myNet.node("RiverFlow").retractFindings()
	console.log("New P(Evidence):", myNet.findingsProbability())
	console.log()

	console.log("[Set RiverFlow = state0]")
	rf.finding(0)
	console.log("RiverFlow node beliefs|RiverFlow=state0:", rf.beliefs())
	console.log("[Clear all findings]")
	myNet.node("RiverFlow").retractFindings()
	console.log("RiverFlow node beliefs:", rf.beliefs())
	console.log()

	console.log("RiverFlow Virtual Evidence (Likelihoods):", rf.likelihoods())
	console.log("P(RiverFlow):", rf.beliefs())
	console.log()

	console.log("[Set RiverFlow Likelihoods = 0.3,0.2]")
	rf.likelihoods([0.3,0.2])
	console.log("New P(RiverFlow):", rf.beliefs())
	console.log("New Virtual Evidence:", rf.likelihoods())
	console.log()

	console.log("[Set RiverFlow Likelihoods = 0.4,0.2]")
	rf.likelihoods([0.4,0.2])
	console.log("New P(RiverFlow):", rf.beliefs())
	console.log("New Virtual Evidence:", rf.likelihoods())
	console.log()

	console.log("[Retract Likelihoods]");
	rf.retractFindings();
	console.log("New P(RiverFlow):", rf.beliefs())
	console.log("New Virtual Evidence:", rf.likelihoods())
	console.log()

	console.log("[Create node called TestA]")
	let node = new Node(myNet, "TestA")
	console.log()

	console.log("[Create node called TestB using addNode]")
	myNet.addNode("TestB");
	console.log()

	console.log("TestA states:", node.stateNames())
	console.log()
	
	console.log("[Add state called 'three']")
	node.addState('three')
	console.log("TestA states:", node.stateNames())
	console.log()

	console.log("[Rename state0 to 'one']")
	node.renameState(0, 'one')
	console.log("TestA states:", node.stateNames())
	console.log()

	console.log("[Rename all states to one,two,three]")
	node.renameStates(['one','two','three'])
	console.log("TestA states:", node.stateNames())
	console.log()

	console.log("[Create node TestB with one state called 'a'")
	console.log(" (fails in GeNIe because doesn't allow it")
	console.log(" --- i.e. creates node with 2 states, wrongly named)]")
	node = new Node(myNet, "TestB", ['a'])
	console.log("TestB states:", node.stateNames())
	console.log()

	console.log("[Create node TestC with 3 states, called a,b,c]")
	node = new Node(myNet, "TestC", ['a','b','c'])
	console.log("TestC states:", node.stateNames())
	console.log()

	console.log("TestC CPT:", node.cpt1d())
	console.log()

	console.log("RiverFlow CPT:", rf.cpt1d())
	console.log()

	console.log("[Set TestC CPT with 0.3,0.3,0.3. Should give 1/3,1/3,1/3]")
	node.cpt1d([0.3,0.3,0.3])
	console.log("New TestC CPT:", node.cpt1d())
	console.log()

	console.log('[Get RiverFlow parents & children]');
	console.log('Parents:', rf.parents().map(p => p.name()));
	console.log('Children:', rf.children().map(c => c.name()));

	console.log("[Add RiverFlow as parent to TestC]")
	node.addParents(["RiverFlow"])
	console.log("[Add FishAbundance as child of TestC]")
	node.addChildren(["FishAbundance"])
	console.log()

	console.log("1D CPT:", node.cpt1d())
	node.cpt1d([0.1,0.3,0.7,0.2,0.1,0.1])
	console.log("[Set TestC CPT to [0.1,0.3,0.7,0.2,0.1,0.1] using 1D array]")
	console.log("New 1D CPT:", node.cpt1d())
	console.log()

	console.log("2D CPT:", node.cpt())
	node.cpt([[0.1,0.3,0.2],[0.2,0.4,0.4]])
	console.log("[Set TestC CPT to [[0.1,0.3,0.2],[0.2,0.4,0.4]] using 2D array]")
	console.log("New 2D CPT:", node.cpt())
	console.log("New 1D CPT:", node.cpt1d())
	console.log()

	console.log("[Run through all nodes, and print names and titles]")
	for (let node of myNet.nodes()) {
		console.log(node.name(), node.title())
	}
	console.log()

	console.log("[Run through all parents of FishAbundance, print names and titles]")
	for (let node of myNet.node("FishAbundance").parents()) {
		console.log(node.name(), node.title())
	}
	console.log()

	console.log("[Print FishAbundance comment]")
	console.log(myNet.node("FishAbundance").comment())
	console.log("[Change and print comment]")
	myNet.node("FishAbundance").comment("This is a new comment")
	console.log(myNet.node("FishAbundance").comment())
	console.log()

	console.log("RiverFlow's visual position:", rf.position())
	console.log("[Set RiverFlow's visual position to 120,400]")
	console.log("RiverFlow's visual position:", rf.position(120,400).position())
	console.log()

	let fap = myNet.node("FishAbundance").parents();
	console.log("Combinations of parent states for FishAbundance: ", Net.numberCombinations(fap));

	console.log("Parent state combinations for FishAbundance:")
	let parentIndexes = Array(fap.length).fill(0);
	while (1) {
		console.log( parentIndexes.map((pi,i) => fap[i].state(pi).name()) );
		if (!Net.nextCombination(parentIndexes, fap))  break;
	}

	console.log("[Write net to file called ../nets/output_NF_V1_test.dne]")
	myNet.write(netsDir+"output_NF_V1_test.dne")
	console.log()
}

mainTests();