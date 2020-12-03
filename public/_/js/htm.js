(function(global) {
	function node(tag, ...args) {
		var parts = tag.split(/(?=[.#])/);
		var tag = parts[0];
		var attrs = parts.slice(1);
		var el = document.createElement(tag);
		var attr = null;
		var arg = null;
		var i = 0;
		for (i=0; i<attrs.length; i++) {
			attr = attrs[i];
			if (attr[0] == '.')  el.classList.add(attr.slice(1));
			else if (attr[0] == '#')  el.id = attr.slice(1);
		}
		for (i=0; i<args.length; i++) {
			arg = args[i];
			handleArg(el, arg);
		}
		
		return el;
	}

	function qnode(tag, ...args) {
		let el = document.createElement(tag);

		for (i=0; i<args.length; i++) {
			arg = args[i];
			handleArg(el, arg);
		}

		return el;
	}

	function handleArg(el, arg) {
		var type = typeof arg;
		if (arg === null) {
			/// pass
		}
		/// This is far quicker than instanceof, though more prone to error
		else if (arg && arg.nodeType && arg.nodeName) {
		//else if (arg instanceof Element || arg instanceof DocumentFragment) {
			el.appendChild(arg);
		}
		else if (Array.isArray(arg)) {
			let args = arg;
			for (var arg of args) {
				handleArg(el, arg);
			}
		}
		else if (type == "string" || type == "number" || type == "boolean") {
			el.appendChild(document.createTextNode(String(arg)));
		}
		else {
			for (var attr in arg) {
				var attrVal = arg[attr];
				if (attr in node.hooks)  node.hooks[attr](el, attrVal, attr);
				else if (attrVal===null || attrVal===undefined) ;
				else {
					/// Convert mixedCase to mixed-case
					attr = attr.replace(/[A-Z]/g, m => '-'+m.toLowerCase());
					el.setAttribute(attr, String(attrVal));
				}
			}
		}
	}

	/// Attributes that do custom things. Recommend prefixing with 'hook'. JS style names only.
	node.hooks = {}
	var n = node;

	/// A rather important hook
	node.hooks.on = (el, obj) => {
		for (var [eventName,func] of Object.entries(obj)) {
			el.addEventListener(eventName, func);
		}
	}

	node.hooks.dataText = (el, arg) => {
		el.appendChild(document.createTextNode(String(arg)));
	}

	/*function syncNode(target, source) {
		var nodesToSync = [target];
		
	}*/
	function toHtml(str) {
		if (str===null || str===undefined)  return "";
		str = ""+str;
		str = str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
		return str;
	}

	/** Call using html`<div>${content}</div>` or using html('<div>'+content+'</div>') **/
	function html(strs, ...keys) {
		if (strs && strs.nodeType !== undefined)  return strs;
		let str = typeof(strs)=="string" ? strs : strs[0] + keys.map((k,i) => toHtml(k)+strs[i+1]).join('');
		var wrapper = document.createElement('div');
		var range = document.createRange();
		wrapper.innerHTML = str;
		range.selectNodeContents(wrapper);
		return range.extractContents();
	}

	global.node = node;
	global.qnode = qnode;
	global.n = n;
	global.q = str => document.querySelector(str);
	global.qa = str => [...document.querySelectorAll(str)];
	global.toHtml = toHtml;
	global.html = html;
})(window || global);