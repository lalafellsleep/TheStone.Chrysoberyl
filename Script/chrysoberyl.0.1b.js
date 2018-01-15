(function(doc)
{
	"use strict";
	var version = "1.0.0",
	replaceRgx = /(---|--|NaN|Infinity)/im,
	nickRgx = /\s\((.*?)\)/im,
	ws = null,
	onACTWebSocket = !1,
	sortkey = "encdps",
	overlayPluginVersion = "",
	lastCombat = {},
	ACTColumnAdder = !1,
	overlayTypes = {
		"Browser":0, // ACTWebSocket with Browser
		"OverlayPlugin":1, // OverlayPlugin
		"OverlayProcess":2, // ACTWebSocket
	},
	ffxivDict = {
		"pets":{
			"Smn":[/^카벙클/im, /에기$/im, /エギ$/im, /-egi$/im, /-karfunkel$/im, /^carbuncle/im, /carbuncle$/im, /^カーバンクル/im],
			"Sch":[/^요정/im, /^eos$/im, /^selene$/im, /^フェアリー/im],
			"Mch":[/^자동포탑/im, /^オートタレット/im, /autoturret$/im, /^auto-tourelle/im],
			"Ast":[/^지상의/im, /^earthly/im]
		},
		"role":{
			"Pld":"Tanker",
			"Gla":"Tanker",
			"Gld":"Tanker",
			"War":"Tanker",
			"Mrd":"Tanker",
			"Drk":"Tanker",

			"Whm":"Healer",
			"Cnj":"Healer",
			"Sch":"Healer",
			"Ast":"Healer",
			
			"Mnk":"DPS",
			"Pgl":"DPS",
			"Drg":"DPS",
			"Lnc":"DPS",
			"Rog":"DPS",
			"Nin":"DPS",
			"Sam":"DPS",
			
			"Arc":"DPS",
			"Brd":"DPS",
			"Mch":"DPS",

			"Thm":"DPS",
			"Blm":"DPS",
			"Acn":"DPS",
			"Smn":"DPS",
			"Rdm":"DPS"
		},
		"jobclass":{
			"Gla":"PLD",
			"Gld":"PLD",
			"Mrd":"WAR",
			"Cnj":"WHM",
			"Pgl":"MNK",
			"Lnc":"DRG",
			"Rog":"NIN",
			"Arc":"BRD",
			"Thm":"BLM",
			"Acn":"SMN"
		},
		"sortkey":{
			"dps":"damage",
			"encdps":"damage",
			"hps":"healed",
			"enchps":"healed",
			"maxhit":"maxhitval",
			"maxheal":"maxhealval",
			"overheal%":"overHeal"
		}
	},
	args = {
		"delete":["NAME3", "NAME4", "NAME5", "NAME6", "NAME7", "NAME8", "NAME9", "NAME10", "NAME11", "NAME12", "NAME13", "NAME14", "NAME15", "DAMAGE-b", "DAMAGE-k", "DAMAGE-m", "ENCDPS-k", "ENCDPS-m", "ENCHPS-k", "ENCHPS-m", "crittypes", "t", "n", "threatdelta", "threatstr", "DPS-k", "DPS-m", "TOHIT", "damage-b", "damage-m", "MAXHITWARD", "MAXHEALWARD", "maxhealward"],
		"double":["Last10DPS", "Last30DPS", "Last60DPS", "Last180DPS", "encdps", "enchps", "tohit", "dps", "BlockPct", "DirectHitPct", "OverHealPct", "ParryPct", "crithit%", "damage%", "critheal%", "healed%", "IncToHit"],
		"decimal":["CritDirectHitCount", "CritDirectHitPct", "DPS", "DURATION", "DirectHitCount", "ENCDPS", "ENCHPS", "crithits", "hits", "kills", "swings", "overHeal", "powerdrain", "powerheal", "damage", "critheals", "absorbHeal", "damageShield", "damagetaken", "heals", "healstaken", "hitfailed", "misses", "cures", "healed", "deaths"],
		"string":["MAXHIT", "MAXHEAL"],
		"merged":["damage", "hits", "swings", "misses", "crithits", "DirectHitCount", "CritDirectHitCount", "damagetaken", "heals", "healed", "critheals", "healstaken", "damageShield", "overHeal", "absorbHeal", "effectiveHeal"]
	},
	overlayType = overlayTypes.Browser,
	petMerge = !0,
	ACTWebSocketConnect = function(provider, url, type)
	{
		this.connect = function()
		{
			if(typeof this.websocket != "undefined" && this.websocket != null)
				this.close();
			this.activate = true;
			var This = this;
			this.websocket = new WebSocket(this.url);
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
			provider.onRecvMessage(e);
		};
		this.onBroadcastMessage = function(e)
		{
			provider.onBroadcastMessage(e);
		};

		if(type == undefined) type = "MiniParse";
		var querySet = this.getQuerySet();
		var This = this;

		if(url !== undefined)
			url += type;
			
		this.url = url;
		this.id = null;
		this.active = false;

		document.addEventListener('onBroadcastMessage', function(evt) 
		{
			provider.onBroadcastMessage(evt);
		});
		document.addEventListener('onRecvMessage', function(evt) 
		{
			provider.onRecvMessage(evt);
		});
		window.addEventListener('message', function (e) 
		{
			if (e.data.type === 'onBroadcastMessage') 
			{
				provider.onBroadcastMessage(e.data);
			}
			if (e.data.type === 'onRecvMessage') 
			{
				provider.onRecvMessage(e.data);
			}
		});
	},
	Chrysoberyl = function()
	{
		this.debug = false;
		this.sortkey = sortkey;
		this.version = version;
		this.overlaydata = function(e)
		{
			if(e.detail.Encounter.CurrentRealUserName != undefined && e.detail.Encounter.CurrentZoneRaw != 0)
				ACTColumnAdder = !0;

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

			for(var i in lastCombat.Encounter)
			{
				if(args.double.indexOf(i) > -1 || args.decimal.indexOf(i) > -1)
					lastCombat.Encounter[i] = parseFloat(lastCombat.Encounter[i].replace(replaceRgx, "0").replace(/%/, ""));
				if(args.string.indexOf(f) > -1)
					lastCombat.Combatant[i][f] = parseInt(lastCombat.Combatant[i][f].replace(/\.|,/, "").replace(replaceRgx, "0"));
			}
			
			for(var i in lastCombat.Combatant)
			{
				for(var f in lastCombat.Combatant[i])
				{
					if(args.double.indexOf(f) > -1 || args.decimal.indexOf(f) > -1)
						lastCombat.Combatant[i][f] = parseFloat(lastCombat.Combatant[i][f].replace(replaceRgx, "0").replace(/%/, ""));
					if(args.string.indexOf(f) > -1)
						lastCombat.Combatant[i][f] = parseInt(lastCombat.Combatant[i][f].replace(/\.|,/, "").replace(replaceRgx, "0"));
				}
	
				if(ACTColumnAdder)
				{
					if(lastCombat.Combatant[i].name == "YOU")
						lastCombat.Combatant[i].displayName = lastCombat.Encounter.CurrentRealUserName;
					else
						lastCombat.Combatant[i].displayName = lastCombat.Combatant[i].name;
				}
				else if(lastCombat.Encounter.PrimaryUser != undefined)
				{
					if(lastCombat.Combatant[i].name == "YOU")
						lastCombat.Combatant[i].displayName = lastCombat.Encounter.PrimaryUser;
					else
						lastCombat.Combatant[i].displayName = lastCombat.Combatant[i].name;
				}
				else
				{
					lastCombat.Combatant[i].displayName = lastCombat.Combatant[i].name;
				}
	
				lastCombat.Combatant[i].isPet = !1;
				lastCombat.Combatant[i].hasPet = !1;
				lastCombat.Combatant[i].hasOwner = !1;
				// cleaveore compatibility
				lastCombat.Combatant[i].effectiveHeal = lastCombat.Combatant[i].healed - lastCombat.Combatant[i].overHeal;
	
				if(nickRgx.test(lastCombat.Combatant[i].name))
				{
					lastCombat.Combatant[i].hasOwner = !0;
					lastCombat.Combatant[i].owner = lastCombat.Combatant[i].name.match(nickRgx)[1];
				}
			}
	
			lastCombat.DURATION = lastCombat.Encounter.DURATION;
			lastCombat.duration = lastCombat.Encounter.duration;
	
			for(var i in lastCombat.Combatant)
			{
				if(lastCombat.Combatant[i].hasOwner)
				{
					if(lastCombat.getCombatantByDisplayName(lastCombat.Combatant[i].owner) == undefined) continue;
					lastCombat.getCombatantByDisplayName(lastCombat.Combatant[i].owner).pets = [];
					// pettype
					for(var r in ffxivDict.pets)
					{
						for(var rgx in ffxivDict.pets[r])
						{
							var type = lastCombat.Combatant[i].name.replace(nickRgx, "");
							if(ffxivDict.pets[r][rgx].test(type))
							{
								lastCombat.Combatant[i].isPet = !0;
								lastCombat.Combatant[i].petType = r;
								lastCombat.Combatant[i].Job = lastCombat.Combatant[i].petType;
								if(lastCombat.getCombatantByDisplayName(lastCombat.Combatant[i].owner) != undefined)
									lastCombat.getCombatantByDisplayName(lastCombat.Combatant[i].owner).pets.push(lastCombat.Combatant[i].displayName);
							}
						}
					}
					if(lastCombat.Combatant[i].isPet == !0)
					{
						lastCombat.getCombatantByDisplayName(lastCombat.Combatant[i].owner).merged = {};
						for(var x in args.merged)
						{
							lastCombat.getCombatantByDisplayName(lastCombat.Combatant[i].owner).merged[args.merged[x]] = lastCombat.Combatant[i][args.merged[x]] + lastCombat.getCombatantByDisplayName(lastCombat.Combatant[i].owner)[args.merged[x]];
						}
					}
				}
	
				lastCombat.Combatant[i].role = ffxivDict.role[lastCombat.Combatant[i].Job];
				lastCombat.Combatant[i].maxhitstr = lastCombat.Combatant[i].maxhit.split('-')[0];
				lastCombat.Combatant[i].maxhitval = lastCombat.Combatant[i].MAXHIT;
				lastCombat.Combatant[i].maxhealstr = lastCombat.Combatant[i].maxheal.split('-')[0];
				lastCombat.Combatant[i].maxhealval = lastCombat.Combatant[i].MAXHEAL;
	
				if(ffxivDict.jobclass[lastCombat.Combatant[i].Job] != undefined)
					lastCombat.Combatant[i].Class = ffxivDict.jobclass[lastCombat.Combatant[i].Job];
				else
					lastCombat.Combatant[i].Class = lastCombat.Combatant[i].Job.toUpperCase();
	
				if(typeof lastCombat.Combatant[i].merged === "object")
				{
					lastCombat.Combatant[i].recalculated = {
						"dps": lastCombat.Combatant[i].merged.damage / lastCombat.Combatant[i].DURATION,
						"hps": lastCombat.Combatant[i].merged.healed / lastCombat.Combatant[i].DURATION,
						"encdps": lastCombat.Combatant[i].merged.damage / lastCombat.Encounter.DURATION,
						"enchps": lastCombat.Combatant[i].merged.healed / lastCombat.Encounter.DURATION,
						"DPS": 0,
						"HPS": 0,
						"ENCDPS": 0,
						"ENCHPS": 0,
						"tohit": lastCombat.Combatant[i].merged.hits / lastCombat.Combatant[i].merged.swings * 100,
						"damage%": lastCombat.Combatant[i].merged.damage / lastCombat.Encounter.damage * 100,
						"healed%": lastCombat.Combatant[i].merged.healed / lastCombat.Encounter.healed * 100,
						"crithit%": lastCombat.Combatant[i].merged.crithits / lastCombat.Combatant[i].merged.swings * 100,
						"overHeal%": lastCombat.Combatant[i].merged.overHeal / lastCombat.Combatant[i].merged.healed * 100,
						"critheal%": lastCombat.Combatant[i].merged.critheals / lastCombat.Combatant[i].merged.heals * 100,
						"DirectHit%": lastCombat.Combatant[i].merged.DirectHitCount / lastCombat.Combatant[i].merged.swings * 100,
						"CritDirectHit%": lastCombat.Combatant[i].merged.CritDirectHitCount / lastCombat.Combatant[i].merged.swings * 100
					};
				}
				else
				{
					lastCombat.Combatant[i].recalculated = {
						"dps": lastCombat.Combatant[i].damage / lastCombat.Combatant[i].DURATION,
						"hps": lastCombat.Combatant[i].healed / lastCombat.Combatant[i].DURATION,
						"encdps": lastCombat.Combatant[i].damage / lastCombat.Encounter.DURATION,
						"enchps": lastCombat.Combatant[i].healed / lastCombat.Encounter.DURATION,
						"DPS": 0,
						"HPS": 0,
						"ENCDPS": 0,
						"ENCHPS": 0,
						"tohit": lastCombat.Combatant[i].hits / lastCombat.Combatant[i].swings * 100,
						"damage%": lastCombat.Combatant[i].damage / lastCombat.Encounter.damage * 100,
						"healed%": lastCombat.Combatant[i].healed / lastCombat.Encounter.healed * 100,
						"crithit%": lastCombat.Combatant[i].crithits / lastCombat.Combatant[i].swings * 100,
						"overHeal%": lastCombat.Combatant[i].overHeal / lastCombat.Combatant[i].healed * 100,
						"critheal%": lastCombat.Combatant[i].critheals / lastCombat.Combatant[i].heals * 100,
						"DirectHit%": lastCombat.Combatant[i].DirectHitCount / lastCombat.Combatant[i].swings * 100,
						"CritDirectHit%": lastCombat.Combatant[i].CritDirectHitCount / lastCombat.Combatant[i].swings * 100
					};
				}
				
				if(!ACTColumnAdder)
					lastCombat.Combatant[i]["overHeal%"] = lastCombat.Combatant[i]["OverHealPct"];
	
				lastCombat.Combatant[i].recalculated.DPS = Math.round(lastCombat.Combatant[i].recalculated.dps);
				lastCombat.Combatant[i].recalculated.HPS = Math.round(lastCombat.Combatant[i].recalculated.hps);
				lastCombat.Combatant[i].recalculated.ENCDPS = Math.round(lastCombat.Combatant[i].recalculated.encdps);
				lastCombat.Combatant[i].recalculated.ENCHPS = Math.round(lastCombat.Combatant[i].recalculated.enchps);
	
				for(var x in lastCombat.Combatant[i].recalculated)
				{
					if(isNaN(lastCombat.Combatant[i].recalculated[x]))
						lastCombat.Combatant[i].recalculated[x] = 0;
				}
	
				if(isNaN(lastCombat.Combatant[i].maxhitval))
					lastCombat.Combatant[i].maxhitval = 0;
	
				if(isNaN(lastCombat.Combatant[i].maxhealval))
					lastCombat.Combatant[i].maxhealval = 0;
	
				lastCombat.Combatant[i].get = function(key)
				{
					if(this.recalculated != undefined)
						if(this.recalculated[key] != undefined)
							return this.recalculated[key];
	
					if(this.merged != undefined)
						if(this.merged[key] != undefined)
							return this.merged[key];
					
					return this[key];
				}
	
				lastCombat.Combatant[i].getpet = function(key)
				{
					if(this.pets != undefined)
					{
						var value = 0;
						for(var i in this.pets)
						{
							value += lastCombat.getCombatantByDisplayName(this.pets[i]).get(key);
						}
						return value;
					}
					else
					{
						return 0;
					}
				}
			}
			lastCombat.summonerMerge = petMerge;
			lastCombat.sortkey = sortkey;
			lastCombat.maxValue = 0;
			lastCombat.zone = lastCombat.Encounter.CurrentZoneName;
			lastCombat.sortAsc = [];
			lastCombat.sortDesc = [];
			lastCombat.resort = function(sortkey)
			{
				lastCombat.maxValue = 0;
				if(ffxivDict.sortkey[sortkey] != undefined)
					lastCombat.sortkey = ffxivDict.sortkey[sortkey];
				else
					lastCombat.sortkey = sortkey;
	
				for(var i in lastCombat.Combatant)
				{
					if(lastCombat.Combatant[i].get(lastCombat.sortkey) > lastCombat.maxValue)
						lastCombat.maxValue = lastCombat.Combatant[i].get(lastCombat.sortkey);
				}
	
				var idx = 0;
				for(var i in lastCombat.Combatant)
				{
					lastCombat.sortAsc[idx] = {"value":lastCombat.Combatant[i].get(lastCombat.sortkey), "displayName":lastCombat.Combatant[i].displayName};
					lastCombat.sortDesc[idx++] = {"value":lastCombat.Combatant[i].get(lastCombat.sortkey), "displayName":lastCombat.Combatant[i].displayName};
				}
	
				lastCombat.sortAsc.sort(function(a, b) { return a.value - b.value; });
				lastCombat.sortDesc.sort(function(a, b) { return b.value - a.value; });
			};
	
			lastCombat.sortkeyChange = function(sortkey)
			{
				this.resort(sortkey);
			};
	
			lastCombat.getSnapShot = function(sortkey)
			{
				var maxValue = 0;
				var sort = sortkey;
				var sortAsc = [];
				var sortDesc = [];
				
				if(ffxivDict.sortkey[sort] != undefined)
					sort = ffxivDict.sortkey[sortkey];
	
				for(var i in lastCombat.Combatant)
				{
					if(lastCombat.Combatant[i].get(sort) > maxValue)
					maxValue = lastCombat.Combatant[i].get(sort);
				}
	
				var idx = 0;
				for(var i in lastCombat.Combatant)
				{
					sortAsc[idx] = {"value":lastCombat.Combatant[i].get(sort), "displayName":lastCombat.Combatant[i].displayName};
					sortDesc[idx++] = {"value":lastCombat.Combatant[i].get(sort), "displayName":lastCombat.Combatant[i].displayName};
				}
	
				sortAsc.sort(function(a, b) { return a.value - b.value; });
				sortDesc.sort(function(a, b) { return b.value - a.value; });
	
				return { "asc": sortAsc, "desc": sortDesc, "sortkey": sort, "maxValue": maxValue };
			}
	
			lastCombat.displayHPS = ["Cnj", "Whm", "Sch", "Ast", "Rdm"];
	
			lastCombat.resort(sortkey);
			try
			{
				window.onOverlayDataUpdate(lastCombat);
			}
			catch(ex) 
			{ 
				console.error(ex);
			}
		};

		this.html = function(name, str)
		{
			if(str == undefined)
			{
				return doc.querySelector(name);
			}
			else
			{
				doc.querySelector(name).innerHTML = str;
			}
		}
	
		this.q = function(name)
		{
			if(name.indexOf("#") == 0)
			{
				return doc.querySelector(name);
			}

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

		this.onBroadcastMessage = function(message)
		{
			switch(message.detail.msgtype)
			{
				case "CombatData":
					// console.log(message.detail);
					var data = { "detail":message.detail.msg };
					this.overlaydata(data);
					break;
				default:
					if(this.debug)
						console.warn("[DEBUG]", message.detail);
					break;
			}
		};

		this.onRecvMessage = function(message)
		{
			
		};
		
		this.takeScreenShot = function()
		{
			switch(overlayType)
			{
				case 0:
					this.ws.overlayAPI('Capture');
					break;
				case 1:
					var overlay = window.OverlayPluginApi.overlayName;
					window.OverlayPluginApi.takeScreenshot(overlay); // 0.3.4.n upper
					break;
			}
		};
	
		this.endEncounter = function()
		{
			switch(overlayType)
			{
				case 0:
					this.ws.overlayAPI('RequestEnd');
					break;
				case 1:
					window.OverlayPluginApi.endEncounter();
					break;
			}
		};
	
		this.queryString = new function()
		{
			var href = window.location.href, key, value;
			var params = href.slice(href.indexOf('?') + 1).split('&');
			var qs = [];
	
			for (var i=0; i<params.length; i++)
			{
				key = params[i].split('=');
				value = key[1];
				key = key[0];
				qs.push(key);
				qs[key] = value;
			}
	
			return qs;
		};

		this.util = new function()
		{

		};

		this.host_port = this.queryString["HOST_PORT"];
		if(overlayType != overlayTypes.OverlayPlugin)
			if(this.host_port == "" || this.host_port == undefined)
				if(location.href.indexOf("https://") > -1)
					this.host_port = "wss://127.0.0.1:10501/";
				else
					this.host_port = "ws://127.0.0.1:10501/";

		try
		{
			if(window.OverlayPluginApi)
			{
				overlayType = overlayTypes.OverlayPlugin;
				overlayPluginVersion = window.OverlayPluginApi.version;
				console.warn("[INIT] Chrysoberyl " + this.version + " Running on OverlayPlugin ver " + window.OverlayPluginApi.version);
			}
			if(window.navigator.userAgent.indexOf("OverlayWindow") > -1 && window.navigator.userAgent.indexOf("QtWebEngine") > -1)
			{
				onACTWebSocket = true;
				console.warn("[INIT] Chrysoberyl " + this.version + " Running on ACTWebSocket Overlay Process");
			}
		}
		catch(ex)
		{
			console.error(ex);
		}

		switch(overlayType)
		{
			case 1:
				document.addEventListener('onOverlayDataUpdate', this.overlaydata);
			break;
			case 0:
			case 2:
				try
				{
					if(location.href.indexOf("https://") > -1)
						this.host_port = this.host_port.replace("ws://", "wss://");
					this.ws = new ACTWebSocketConnect(this, this.host_port);
					this.ws.connect();
				}
				catch(ex)
				{
					console.error(ex);
				}
			break;
		}
	};
	window.Chrysoberyl = new Chrysoberyl();
	window._ = window.Chrysoberyl;
})(document);