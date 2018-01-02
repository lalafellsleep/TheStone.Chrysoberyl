(function(doc)
{
	var overlayTypes = {
		"Browser":0, // ACTWebSocket with Browser
		"OverlayPlugin":1, // OverlayPlugin
		"OverlayProcess":2, // ACTWebSocket
	};
	var sortkey = "encdps";
	var overlayPluginVersion = "";
	var overlayType = overlayTypes.Browser;
	var lastCombat = {};
	var ACTColumnAdder = false;
	var ffxivDict = {
		"pets":{
			"smn":[/^카벙클/im, /에기$/im, /エギ$/im, /-egi$/im, /-karfunkel$/im, /^carbuncle/im, /carbuncle$/im, /^カーバンクル/im],
			"sch":[/^요정/im, /^eos$/im, /^selene$/im, /^フェアリー/im],
			"mch":[/^자동포탑/im, /^オートタレット/im, /autoturret$/im, /^auto-tourelle/im],
			"ast":[/^지상의/im, /^earthly/im]
		}
	};

	var qs = function(name)
	{
		if (doc.querySelectorAll) 
		{
			return doc.querySelectorAll(name);
		}

		var elements = doc.getElementsByTagName('div');
		var ret = [];

		for (i = 0; i < elements.length; i++) 
		{
			if (~elements[i].className.split(' ').indexOf(name.replace(/\.|#/, ""))) 
			{
				ret.push(elements[i]);
			}
		}
		return ret;
	};
	var queryString = function()
	{
		var href = window.location.href, key, value;
		var params = href.slice(href.indexOf('?') + 1).split('&');
		var qs = [];

		for (i=0; i<params.length; i++)
		{
			key = params[i].split('=');
			value = key[1];
			key = key[0];
			qs.push(key);
			qs[key] = value;
		}

		return qs;
	};
	var takeScreenShot = function()
	{
		switch(overlayType)
		{
			case 0:

				break;
			case 1:
				var overlay = window.OverlayPluginApi.overlayName;
				window.OverlayPluginApi.takeScreenShot(overlay);
				break;
		}
	};
	var endEncounter = function()
	{

	};
	var ACTWebSocketConnect = function(url, type)
	{
		this.connect = function()
		{
			if(typeof this.websocket != "undefined" && this.websocket != null)
				this.close();
			this.activate = true;
			var This = this;
			this.websocket = new WebSocket(this.uri);
			this.websocket.onopen = function(evt) {This.onopen(evt);};
			this.websocket.onmessage = function(evt) {This.onmessage(evt);};
			this.websocket.onclose = function(evt) {This.onclose(evt);};
			this.websocket.onerror = function(evt) {This.onerror(evt);};
		};
		this.close = function()
		{
			this.activate = false;
			if(this.websocket != null && typeof this.websocket != "undefined")
			{
				this.websocket.close();
			}
		};
		this.onopen = function()
		{
			// get id from useragent
			if(this.id != null && typeof this.id != "undefined")
			{
				this.set_id(this.id);
			}
			else
			{
				if(typeof overlayWindowId != "undefined")
				{
					this.set_id(overlayWindowId);
				}
				else
				{
					var r = new RegExp('[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}');
					var id = r.exec(navigator.userAgent);
					if(id != null && id.length == 1)
					{
						this.set_id(id[0]);
					}
				}
			}
		};
		this.onclose = function()
		{
			this.websocket = null;
			if(this.activate)
			{
				var This = this;
				setTimeout(function() {This.connect();}, 5000);
			}
		};
		this.onmessage = function(evt)
		{
			if (evt.data == ".")
			{
				// ping pong
				this.websocket.send(".");
			}
			else
			{
				try{
					var obj = JSON.parse(evt.data);
					var type = obj["type"];
					if(type == "broadcast")
					{
						var from = obj["from"];
						var type = obj["msgtype"];
						var msg = obj["msg"];
						document.dispatchEvent(new CustomEvent('onBroadcastMessage', { detail: obj }));
					}
					if(type == "send")
					{
						var from = obj["from"];
						var type = obj["msgtype"];
						var msg = obj["msg"];
						document.dispatchEvent(new CustomEvent('onRecvMessage', { detail: obj }));
					}
					if(type == "set_id")
					{
						//document.dispatchEvent(new CustomEvent('onIdChanged', { detail: obj }));
					}
				}
				catch(e)
				{
				}
			}
		};
		this.onerror = function(evt)
		{
			this.websocket.close();
			console.log(evt);
		};
		this.getQuerySet = function()
		{
			var querySet = {};
			// get query 
			var query = window.location.search.substring(1);
			var vars = query.split('&');
			for (var i = 0; i < vars.length; i++) {
				try{
					var pair = vars[i].split('=');
					querieSet[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
				}
				catch(e)
				{
				}
			}
			return querySet;
		};
		this.broadcast = function(type, msg)
		{
			if(typeof overlayWindowId != 'undefined' && this.id != overlayWindowId)
			{
				this.set_id(overlayWindowId);
			}
			var obj = {};
			obj["type"] = "broadcast";
			obj["msgtype"] = type;
			obj["msg"] = msg;
			this.websocket.send(JSON.stringify(obj));
		};
		this.send = function(to, type, msg)
		{
			if(typeof overlayWindowId != 'undefined' && this.id != overlayWindowId)
			{
				this.set_id(overlayWindowId);
			}
			var obj = {};
			obj["type"] = "send";
			obj["to"] = to;
			obj["msgtype"] = type;
			obj["msg"] = msg;
			this.websocket.send(JSON.stringify(obj));
		};
		this.overlayAPI = function(type, msg)
		{
			var obj = {};
			if(typeof overlayWindowId != 'undefined' && this.id != overlayWindowId)
			{
				this.set_id(overlayWindowId);
			}
			obj["type"] = "overlayAPI";
			obj["to"] = overlayWindowId;
			obj["msgtype"] = type;
			obj["msg"] = msg;
			this.websocket.send(JSON.stringify(obj));
		};
		this.set_id = function(id)
		{
			var obj = {};
			obj["type"] = "set_id";
			obj["id"] = id;
			this.id = overlayWindowId;
			this.websocket.send(JSON.stringify(obj));
		};
		this.onRecvMessage = function(e)
		{
			onRecvMessage(e);
		};
		this.onBroadcastMessage = function(e)
		{
			onBroadcastMessage(e);
		};
		if(type == undefined) 
			type = "MiniParse";
		var querySet = this.getQuerySet();
		var This = this;
		if(typeof querySet["HOST_PORT"] !== 'undefined')
			url = querySet["HOST_PORT"] + type;
		this.url = url;
		this.id = null;
		this.active = false;
		document.addEventListener('onBroadcastMessage', function(evt) 
		{
			This.onBroadcastMessage(evt);
		});
		document.addEventListener('onRecvMessage', function(evt) 
		{
			This.onRecvMessage(evt);
		});
		window.addEventListener('message', function (e) 
		{
			if (e.data.type === 'onBroadcastMessage') 
			{
				This.onBroadcastMessage(e.data);
			}
			if (e.data.type === 'onRecvMessage') 
			{
				This.onRecvMessage(e.data);
			}
		});
	};
	var overlaydata = function(e)
	{
		var timer = new Date();
		var replaceRgx = /(---|--|NaN|Infinity)/im;
		var nickRgx = /\s\((.*?)\)/im;

		if(e.detail.Encounter.CurrentZoneRaw != 0)
			ACTColumnAdder = true;

		lastCombat = e.detail;

		lastCombat.getCombatantByDisplayName = function(s)
		{
			for(var i in this.Combatant)
			{
				if(this.Combatant[i].displayName == s)
					return this.Combatant[i];
			}

			return this.Combatant[s];
		};
		
		var deleteArgs = ["NAME3", "NAME4", "NAME5", "NAME6", "NAME7", "NAME8", "NAME9", "NAME10", "NAME11", "NAME12", "NAME13", "NAME14", "NAME15", "DAMAGE-b", "DAMAGE-k", "DAMAGE-m", "ENCDPS-k", "ENCDPS-m", "ENCHPS-k", "ENCHPS-m", "crittypes", "t", "n", "threatdelta", "threatstr", "DPS-k", "DPS-m", "TOHIT", "damage-b", "damage-m", "MAXHITWARD", "MAXHEALWARD", "maxhealward"];

		var doubleArgs = ["Last10DPS", "Last30DPS", "Last60DPS", "Last180DPS", "encdps", "enchps", "tohit", "dps", "BlockPct", "DirectHitPct", "OverHealPct", "ParryPct", "crithit%", "damage%", "critheal%", "healed%", "IncToHit"];

		var decimalArgs = ["CritDirectHitCount", "CritDirectHitPct", "DPS", "DURATION", "DirectHitCount", "ENCDPS", "ENCHPS", "crithits", "hits", "kills", "swings", "overHeal", "powerdrain", "powerheal", "damage", "critheals", "absorbHeal", "damageShield", "damagetaken", "heals", "healstaken", "hitfailed", "misses", "cures", "healed", "deaths"];

		var strToDecimalArgs = ["MAXHIT", "MAXHEAL"];

		for(var i in lastCombat.Encounter)
		{
			if(deleteArgs.indexOf(i) > -1)
				delete lastCombat.Encounter[i];

			if(doubleArgs.indexOf(i) > -1)
				lastCombat.Encounter[i] = parseFloat(lastCombat.Encounter[i].replace(replaceRgx, "0.0").replace(/%/, ""));

			if(decimalArgs.indexOf(i) > -1)
				lastCombat.Encounter[i] = parseInt(lastCombat.Encounter[i].replace(replaceRgx, "0"));
				
			if(strToDecimalArgs.indexOf(f) > -1)
				lastCombat.Combatant[i][f] = parseInt(lastCombat.Combatant[i][f].replace(/\.|,/, "").replace(replaceRgx, "0"));
		}

		for(var i in lastCombat.Combatant)
		{
			for(var f in lastCombat.Combatant[i])
			{
				if(deleteArgs.indexOf(f) > -1)
					delete lastCombat.Combatant[i][f];

				if(doubleArgs.indexOf(f) > -1)
					lastCombat.Combatant[i][f] = parseFloat(lastCombat.Combatant[i][f].replace(replaceRgx, "0").replace(/%/, ""));

				if(decimalArgs.indexOf(f) > -1)
					lastCombat.Combatant[i][f] = parseInt(lastCombat.Combatant[i][f].replace(replaceRgx, "0"));

				if(strToDecimalArgs.indexOf(f) > -1)
					lastCombat.Combatant[i][f] = parseInt(lastCombat.Combatant[i][f].replace(/\.|,/, "").replace(replaceRgx, "0"));
			}

			if(lastCombat.Combatant[i].name == "YOU")
				lastCombat.Combatant[i]["displayName"] = lastCombat.Encounter.CurrentRealUserName;
			else
				lastCombat.Combatant[i]["displayName"] = lastCombat.Combatant[i].name;

			lastCombat.Combatant[i]["isPet"] = false;
			lastCombat.Combatant[i]["hasPet"] = false;
			lastCombat.Combatant[i]["hasOwner"] = false;
			lastCombat.Combatant[i]["pets"] = [];

			if(nickRgx.test(lastCombat.Combatant[i].name))
			{
				lastCombat.Combatant[i].hasOwner = true;
				lastCombat.Combatant[i]["owner"] = lastCombat.Combatant[i].name.match(nickRgx)[1];
				lastCombat.Combatant[i].displayName = lastCombat.Combatant[i].name.replace(nickRgx, "");
			}
		}

		for(var i in lastCombat.Combatant)
		{
			if(lastCombat.Combatant[i].hasOwner)
			{
				// pettype
				for(var r in ffxivDict.pets)
				{
					for(var rgx in ffxivDict.pets[r])
					{
						if(ffxivDict.pets[r][rgx].test(lastCombat.Combatant[i].displayName))
						{
							lastCombat.Combatant[i].isPet = true;
							lastCombat.Combatant[i]["petType"] = r;
							if(lastCombat.getCombatantByDisplayName(lastCombat.Combatant[i].owner) != undefined)
								lastCombat.getCombatantByDisplayName(lastCombat.Combatant[i].owner).pets.push(lastCombat.Combatant[i].displayName);
						}
					}
				}
			}
		}

		if(sortkey !== undefined)
		{

		}

		console.warn(lastCombat);
		var n = new Date();
		var elepse = (n.getTime() - timer.getTime());

		if(elepse > 2)
			console.warn("Re-Calculate Combatants " + elepse + " msec");
	};

	try
	{
		if(window.OverlayPluginApi)
		{
			overlayType = overlayTypes.OverlayPlugin;
			overlayPluginVersion = window.OverlayPluginApi.version;
			console.warn("Running on OverlayPlugin ver " + window.OverlayPluginApi.version);
		}

		if(window.navigator.userAgent.indexOf("OverlayWindow") > -1 && window.navigator.userAgent.indexOf("QtWebEngine") > -1)
		{
			onACTWebSocket = true;
			console.warn("Running on ACTWebSocket Overlay Process");
		}
	}
	catch(ex)
	{
		console.error(ex);
	}

	switch(overlayType)
	{
		case 1:
			try
			{
				document.addEventListener('onOverlayDataUpdate', overlaydata);
			}
			catch(ex)
			{

			}
		break;
		case 0:
		case 2:
		
		break;
	}
})(document);