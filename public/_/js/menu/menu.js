window.addEventListener('DOMContentLoaded', function() {
	/// Clicking anywhere not in a menu clears all active menu items
	document.addEventListener("click", function(evt) {
		if (!evt.target.closest(".menu")) {
			dismissActiveMenus();
		}
	});
});

function dismissActiveMenus() {
	document.querySelectorAll(".menu.active, .menu .active").forEach(el => el.classList.remove("active"));
}

function dismissContextMenus() {
	document.querySelectorAll(".menu.contextMenu").forEach(el => el.remove());
}

function clearActiveSiblings(el) {
	/// Remove any active status from siblings
	let menu = el.parentElement.closest(".menu");
	if (menu) {
		[...menu.querySelectorAll(".active")].forEach(el => el.classList.remove("active"));
	}
	return el;
}

/**
|o| is an object/dict of options. options are:
 - label - the label to show for this menu
 - items - the items (e.g. MenuActions) on this menu
 - type - at a minimum, the CSS class, but may be used in other ways as well
Example: 
var menu = Menu({type: "embedded", items: [
	MenuAction('Delete', () => item.delete()),
	MenuAction("<label>Background Color:</label> <input type=text data-control=backgroundColor class=backgroundColor value=''>"),
]});
*/
function Menu(o) {
	if (!(this instanceof Menu))  return Menu.apply(Object.create(Menu.prototype), arguments);
	o = o || {};
	this.label = o.label || "";
	this.items = o.items || [];
	this.type = o.type || "";
	
	this.items.forEach(i => i ? i.menu = this : null);
	
	this._lastMenu = null;
	
	return this;
}
Menu.prototype = {
	make: function() {
		/// Default method to make menu
		var menu = n('div', {class: 'menu '+this.type});

		menu.append(
			n('div.header', html(this.label), {on: {click() {
				/// Mark this menu active
				let menu = this.closest(".menu");
				menu.classList.add("active");
				clearActiveSiblings(menu);
			}}})
		);

		var itemList = n('div.itemList');
		menu.append(itemList);

		for (var i in this.items) {
			if (this.items[i]) {
				let item = this.items[i].make();
				itemList.append(...(item.jquery ? item.toArray() : [item]));
			}
		}

		this._lastMenu = menu;

		return menu;
	},
	
	popup: function(o) {
		var menu = this.make();
		menu.style.left = o.left+'px';
		menu.style.top = o.top+'px';
		document.body.append(menu);
		document.addEventListener('click', function clickEvent(event) {
			if (!event.target.closest('.contextMenu')) {
				menu.remove();
				document.removeEventListener('click', clickEvent);
			}
		});
	},
	
	dismiss: function() {
		this._lastMenu.remove();
	},
	
	collectShortcuts: function() {
		let shortcuts = {};
		for (let item of this.items) {
			Object.assign(shortcuts, item.collectShortcuts());
		}
		return shortcuts;
	},
};

/**
@label: The label to show for this menu item
@action: A function that is executed when the item is selected
@o: an object/dict of additional options. Options are:
	type - at a minimum, the CSS class, but may be used in other ways as well
	shortcut - the keyboard shortcut for this item
*/
function MenuAction(label, action, o) {
	if (!(this instanceof MenuAction))  return MenuAction.apply(Object.create(MenuAction.prototype), arguments);
	o = o || {};
	this.label = label;
	this.action = action ? action : function() {};
	this.type = o.type || "";
	this.shortcut = o.shortcut || null;
	this.menu = o.menu || null; /// Adding it via a menu should auto-set this
	return this;
}
MenuAction.prototype = {
	make: function() {
		var item = n('div', {class: 'menuAction '+this.type, tabindex: '0'});
		/// I don't know if I want this nbsp substitution
		item.append(n('div.label', html(this.label)));
		if (this.shortcut) {
			item.append(n('div.shortcut', this.shortcut));
		}
		item.addEventListener('click', event => {
			this.action();
			if (this.menu)  this.menu.dismiss();
		});
		item.addEventListener('mouseenter', function(evt) {
			//onsole.log(evt.target);
			clearActiveSiblings(evt.target.closest('.menuAction')).classList.add("active");//.focus();
		});
		item.addEventListener('mouseleave', function(evt) {
			evt.target.closest('.menuAction').classList.remove("active");
		});
		item.addEventListener('keypress', function(evt) {
			if (evt.key == "Enter") {
				this.click();
			}
		});

		return item;
	},
	
	collectShortcuts: function() {
		return this.shortcut ? {[this.shortcut]: {action: this.action, label: this.label}} : {};
	},
}