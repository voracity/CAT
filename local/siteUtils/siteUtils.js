function sitePath(path) {
	return path;
}

function sigFig(num, sigFig = 4, decimalsOnly = true) {
	if (num == 0)  return num;
	let absNum = Math.abs(num);
	let sign = Math.sign(num);
	let dig = Math.floor(Math.log10(absNum));
	if (decimalsOnly)  sigFig = Math.max(sigFig, dig);
	let digPow = Math.pow(10, dig-(sigFig-1));
	//onsole.log(absNum, dig, digPow, sign, sigFig);
	if (digPow >= 1) {
		return sign*Math.round(absNum/digPow)*digPow;
	}
	else {
		/// If you multiply by a float, you get cruft. Dividing by an int,
		/// you don't. *shrug*
		return sign*Math.round(absNum/digPow)/Math.round((1/digPow));
	}
}

if (typeof(module)!='undefined') {
	module.exports = {
		sitePath, sigFig
	};
}