/* M:WoH Battle Simulator - Gary Longwith */
/* Initialization and Presentation Layer */
/* This file connects the page to the application logic */

requirejs.config({
	baseUrl: 'assets/js',
	paths: {
		app: '../../src/modules'
	}
});

requirejs(['jquery','app/simulator'],
function ($, model) {
	
	$.fn.exists = function () {
		return this.length !== 0;
	}
	
	$.fn.center = function () {
		this.css("position","absolute");
		this.css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) + $(window).scrollTop()) + "px");
		this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) + $(window).scrollLeft()) + "px");
		return this;
	}
	
	// one time load of cards from DB
	$.ajax({
		url: "src/getcards.php",
		type: "post",
		success: function(output) {
			initialize(output);
		}
	});	
	
	function initialize(input) {
	
		/*** INITIALIZATION SCOPE FUNCTIONS ***/
		
		// starts automated battles
		function initiateBattles() {
			var limit = $("#battleNumbers").val();
			if (!isNaN(limit) && limit !== "") {
				if (simulator.offenseSession.battles < limit) {
					battleData(simulator.battle(false, false));
					simulation = setTimeout(initiateBattles, 1);
				} else {
					simulator.offenseSession.clear();
					simulator.defenseSession.clear();
					$("#stopSample").trigger("click");
				}
			} else {
				battleData(simulator.battle(false, false));
				simulation = setTimeout(initiateBattles, 1);
			}
		}
		
		/*** INITIALIZATION ***/
		var optionList = "", // html options for select lists (to be populated)
			output = JSON.parse(JSON.stringify(JSON.parse(input))),
			simulation, // will be a timeout for automated battles	
			cardData; // object placeholder for the next bit...
		// build our card objects for application use, and populate optionList while we're at it.
		for (var o = 0; o < output.length; o++) {
			optionList += "<option id='"+output[o].id+"'>"+output[o].name+"</option>";
		}
		$(".card").each(function() {
			$(this).html(optionList);
		});
		$("#off-support1").each(function() {
			$(this).html(optionList);
		});
		$("#oc1, #oc2, #oc3, #dc1, #dc2, #dc3").find("input[type='checkbox']").prop("checked", true);
		$("#oc4, #oc5, #dc4, #dc5").find("input[type='checkbox']").prop("checked", false).prop("disabled", true);
		$("#off-combo, #def-combo").prop("checked", true);
		$("#off-adapter, #def-adapter").find("option[value='1.07']").prop("selected", true);
		$("#scrapper, #off-position, #def-position").find("option[value='1']").prop("selected", true);

		// initialize the simulator
		simulator = model.initialize(output, ["oc1","oc2","oc3","oc4","oc5"], ["dc1","dc2","dc3","dc4","dc5"]);
		
		// load any existing presets into the view and register them 
		if (window.localStorage.getItem("presets")) {
			var presets = JSON.parse(window.localStorage.getItem("presets"));
			var preset = "<option>Select Custom Preset...</option>";
			for (var o = 0; o < presets.offense.length; o++) {
				preset += "<option id="+presets.offense[o].id+">"+presets.offense[o].name+"</option>";
			}
			$("#off-presets").html(preset);
			preset = "<option>Select Custom Preset...</option>";
			for (var d = 0; d < presets.defense.length; d++) {
				preset += "<option id="+presets.defense[d].id+">"+presets.defense[d].name+"</option>";
			}
			$("#def-presets").html(preset);
			simulator.setPresets(presets.offense, presets.defense);
		}
		
		
		/* now let's link up the rest of our interface to the simulator */
		// *note* event handler optimization incoming!
		
		// binding preset selection to deck card objects
		$("#off-presets, #def-presets").on("change", function(e) {
			if ($(this).find("option:selected").html() === "Select Custom Preset...") {
				return false;
			}
			var faction = ($(e.target).attr("id") === "off-presets") ? "offense" : "defense",
				cards = simulator.getPresets(faction, $(this).find("option:selected").attr("id")),
				cid;
			
			// reset card filtration to the "All" settings and refilter
			if (faction === "offense") {
				$("#off-alignment, #off-rarity").find("option[value='All']").prop("selected", true);	
			} else {
				$("#def-alignment, #def-rarity").find("option[value='All']").prop("selected", true);
			}
			$("#"+faction+ " .rarity-filter").each(function() {
				var parent = ($(this).parents("div[id^='dc']").exists()) ? $(this).parents("div[id^='dc']") : $(this).parents("div[id^='oc']");
				parent.find(".alignment-filter option[value='All']").prop("selected", true);
				parent.find(".rarity-filter option[value='All']").prop("selected", true);
				filterCardView(parent);
			});
			
			// update views and card objects
			for (var i = 0; i < cards.length; i++) {
				simulator.adjustSkill(cards[i].view, cards[i].skill);
				$("#"+cards[i].view)
					.find(".card option[id='"+cards[i].data.id+"']").prop("selected", true).end()
					.find(".skill option[value='"+cards[i].skill+"']").prop("selected", true).end()
					.find(".card").trigger("change");	
			}
			battleLog(simulator.battle(false, true));
		});
		
		// binding card selections to and settings associated card objects and properties
		$(".deck").on("change", function(e) {
			var view = ($(e.target).parents("div[id^='dc']").exists()) ? $(e.target).parents("div[id^='dc']") : $(e.target).parents("div[id^='oc']");
			switch ($(e.target).attr("class")) {
				case "card":
					// update view and associated card object
					var cid = simulator.changeCard(view.attr("id"), $(e.target).find("option:selected").attr("id"));
					updateCardView(view.attr("id"), cid);
					comboDetect(e.target);
					break;
				case "rarity-filter":
				case "alignment-filter":
					// filter and repopulate associated card selections
					filterCardView(view);
					// trigger card change
					view.find(".card").trigger("change");
					break;
				case "skill":
					// update associated card object
					simulator.adjustSkill(view.attr("id"), $(e.target).find("option:selected").attr("value"));
					break;
				default:
					// must be unclassed checkbox
					buffLimiter(simulator.toggleCard(view.attr("id")), view);
					break;
			}
			$("#total-defense").val(simulator.defense.total("def"));
			$("#total-offense").val(simulator.offense.total("atk"));
			battleLog(simulator.battle(false, true));
		});
		
		$(".deck").on("click", function(e) {
			var view = ($(e.target).parents("div[id^='dc']").exists()) ? $(e.target).parents("div[id^='dc']") : $(e.target).parents("div[id^='oc']"),
				prefix, viewNum, thatView;
			switch ($(e.target).attr("class")) {
				case "up-arrow":
					prefix = view.attr("id").substr(0,2);
					viewNum = parseInt(view.attr("id").charAt(2));
					if (viewNum !== 1) {
						thatView = $("#"+prefix + (viewNum-1));
						var id1 = view.find(".card option:selected").attr("id");
						var id2 = thatView.find(".card option:selected").attr("id");
						var skill1 = view.find(".skill option:selected").attr("value");
						var skill2 = thatView.find(".skill option:selected").attr("value");
						if (!view.find(".card option[id='"+id2+"']").attr("id")) {
							view.find(".alignment-filter option[value='All']").prop("selected", true);
							view.find(".rarity-filter option[value='All']").prop("selected", true);
							filterCardView(view);
						}
						view.find(".card option[id='"+id2+"']").prop("selected", true);
						view.find(".skill option[value='"+skill2+"']").prop("selected", true);
						view.find(".card").trigger("change");
						
						if (!thatView.find(".card option[id='"+id1+"']").attr("id")) {
							thatView.find(".alignment-filter option[value='All']").prop("selected", true);
							thatView.find(".rarity-filter option[value='All']").prop("selected", true);
							filterCardView(thatView);
						}
						thatView.find(".card option[id='"+id1+"']").prop("selected", true);
						thatView.find(".skill option[value='"+skill1+"']").prop("selected", true);
						thatView.find(".card").trigger("change");					
					}
					break;
				case "down-arrow":
					prefix = view.attr("id").substr(0,2);
					viewNum = parseInt(view.attr("id").charAt(2));
					if (viewNum !== 5) {
						thatView = $("#"+prefix + (viewNum+1));
						var id1 = view.find(".card option:selected").attr("id");
						var id2 = thatView.find(".card option:selected").attr("id");
						var skill1 = view.find(".skill option:selected").attr("value");
						var skill2 = thatView.find(".skill option:selected").attr("value");
						if (!view.find(".card option[id='"+id2+"']").attr("id")) {
							view.find(".alignment-filter option[value='All']").prop("selected", true);
							view.find(".rarity-filter option[value='All']").prop("selected", true);
							filterCardView(view);
						}
						view.find(".card option[id='"+id2+"']").prop("selected", true);
						view.find(".skill option[value='"+skill2+"']").prop("selected", true);
						view.find(".card").trigger("change");
						
						if (!thatView.find(".card option[id='"+id1+"']").attr("id")) {
							thatView.find(".alignment-filter option[value='All']").prop("selected", true);
							thatView.find(".rarity-filter option[value='All']").prop("selected", true);
							filterCardView(thatView);
						}
						thatView.find(".card option[id='"+id1+"']").prop("selected", true);
						thatView.find(".skill option[value='"+skill1+"']").prop("selected", true);
						thatView.find(".card").trigger("change");					
					}
					break;	
			}
		});
		
		function filterCardView(view) {
			var alignment = $(view).find(".alignment-filter option:selected").attr("value"),
				rarity = $(view).find(".rarity-filter option:selected").attr("value"),
				filtered = simulator.filterCards(alignment, rarity),
				optionList = "";
			for (var a = 0; a < filtered.length; a++) {
				optionList += "<option id='"+filtered[a].id+"'>"+filtered[a].name+"</option>";	
			}
			$(view).find(".card").html(optionList);
		}
		
		function updateCardView(view, cid) {
			var alignment, parent, stat;
			if (view[0] === "o") {
				alignment = simulator.offense.cards[parseInt(view[2])-1].data.alignment;
				stat = simulator.offense.cards[parseInt(view[2])-1].base_stat;
			} else {
				alignment = simulator.defense.cards[parseInt(view[2])-1].data.alignment;
				stat = simulator.defense.cards[parseInt(view[2])-1].base_stat;
			}
			if (HD) {
				$("#"+view).css("background-image", "url(http://mwoh.thestratusquo.com/assets/images/"+cid+".jpg)");
				switch (alignment) {
					case "Bruiser": alignment = "bruiserRed"; break;
					case "Speed": alignment = "speedGreen"; break;
					case "Tactics": alignment = "tacticsBlue"; break;	
				}
				$("#"+view).find(".card-select").attr("class", "card-select "+alignment);
			}
			$("#"+view).find(".card-stats").html(stat);
		}
		
		// bind deck options to associated deck properties
		$(".deck-options").on("change", function(e) {
			switch ($(e.target).attr("id")) {
				case "off-adapter":
					if (parseFloat($(e.target).find("option:selected").attr("value")) > 1) {
						simulator.offense.use_adapter = true;
						simulator.offense.adapter = parseFloat($(e.target).find("option:selected").attr("value"));
					} else {
						simulator.offense.use_adapter = false;
					}
					break;
				case "def-adapter":
					if (parseFloat($(e.target).find("option:selected").attr("value")) > 1) {
						simulator.defense.use_adapter = true;
						simulator.defense.adapter = parseFloat($(e.target).find("option:selected").attr("value"));
					} else {
						simulator.offense.use_adapter = false;
					}
					break;
				case "off-position": simulator.offense.position = $(e.target).find("option:selected").attr("value"); break;
				case "def-position": simulator.defense.position = $(e.target).find("option:selected").attr("value"); break;
				case "scrapper": simulator.offense.scrapper = $(e.target).find("option:selected").attr("value"); break;
				case "off-combo":
				case "def-combo": simulator.comboToggle($(e.target).attr("id")); break;
			}
			battleLog(simulator.battle(false, true));
		});
		
		// filter deck selections and trigger card changes
		$("#off-alignment, #off-rarity").on("change", function() {
			var rarity = $("#off-rarity").find("option:selected").attr("value");
			var alignment = $("#off-alignment").find("option:selected").attr("value");
			var newCards = simulator.filterCards(alignment, rarity);
			var newHTML = "";
			for (var a = 0; a < newCards.length; a++) {
				newHTML += "<option id='"+newCards[a].id+"'>"+newCards[a].name+"</option>";	
			}
			$("#oc1, #oc2, #oc3, #oc4, #oc5").each(function() {
				$(this).find(".card").html(newHTML).trigger("change");
				$(this).find(".alignment-filter option[value='"+alignment+"']").prop("selected", true);
				$(this).find(".rarity-filter option[value='"+rarity+"']").prop("selected", true);
			});
		});
		
		$("#def-alignment, #def-rarity").on("change", function() {
			var rarity = $("#def-rarity").find("option:selected").attr("value");
			var alignment = $("#def-alignment").find("option:selected").attr("value");
			var newCards = simulator.filterCards(alignment, rarity);
			var newHTML = "";
			for (var a = 0; a < newCards.length; a++) {
				newHTML += "<option id='"+newCards[a].id+"'>"+newCards[a].name+"</option>";	
			}
			$("#dc1, #dc2, #dc3, #dc4, #dc5").each(function() {
				$(this).find(".card").html(newHTML).trigger("change");
				$(this).find(".alignment-filter option[value='"+alignment+"']").prop("selected", true);
				$(this).find(".rarity-filter option[value='"+rarity+"']").prop("selected", true);
			});
		});
		
		// Automated Battles Controls
		$("#takeSample").on("click", function() {
			$("#takeSample").prop("disabled", true);
			$("#clearSample").prop("disabled", true);
			initiateBattles();
		});
		
		$("#stopSample").on("click", function() {
			$("#takeSample").prop("disabled", false);
			$("#clearSample").prop("disabled", false);
			clearTimeout(simulation);
		});
		
		$("#clearSample").on("click", function() {
			simulator.offenseSession.clear();
			simulator.defenseSession.clear();
			$("#off-percent, #def-percent").html("0");
			$(".win-ratio span").html("0");
			$("#automated-results .stat-details span").html("0");
			$("#automated-results .ability-details span").html("0");
			$("#automated-results .card-details td + td span").html("0");
		});	
		
		
		// Save A Preset
		$("#save-offense, #save-defense").on("click", function(e) {
			if (window.localStorage) {
				var name = prompt("Please name this preset:", "Preset Name"), newPreset, faction;
				if ($(e.target).attr("id") === "save-offense") {
					faction = "offense";
				} else {
					faction = "defense";
				}
				newPreset = simulator[faction].save(name);
				if (newPreset) {
					if (faction === "offense") {
						$("#off-presets").append(newPreset);
					} else {
						$("#def-presets").append(newPreset);
					}
				}
			}
		});
		
		// Delete A Preset
		$("#off-presets + button, #def-presets + button").on("click", function(e) {
			var confirmDelete = false, faction, id, presets, deleted;
			if ($(e.target).prev("select").attr("id") === "off-presets") {
				faction = "offense";
				presets = $("#off-presets");
			} else {
				faction = "defense";
				presets = $("#def-presets");
			}
			if (presets.find("option:selected").html() !== "Select Custom Preset...") {
				confirmDelete = confirm("Are you sure you want to delete the selected preset?");
			} else {
				$("#popup").html("Please select a preset to delete first.").center().fadeIn("fast", function() {
					setTimeout(function() {
						$("#popup").fadeOut("fast");
					}, 2000);
				});
			}
			if (confirmDelete) {
				id = presets.find("option:selected").attr("id");
				if (simulator[faction].remove(id)) {
					presets.find("option:selected").remove();
					$("#popup").html("You have successfully deleted the preset.").center().fadeIn("fast", function() {
						setTimeout(function() {
							$("#popup").fadeOut("fast")
						}, 1000);
					});
				} else {
					$("#popup").html("There was a problem removing the preset.").center().fadeInt("fast", function() {
						settimeout(function() {
							$("#popup").fadeOut("fast")
						}, 2000);
					});
				}
			}
		});
		
		// Update A Preset
		$("#update-defense, #update-offense").on("click", function(e) {
			var targetID, faction, presets, name;
			if ($(e.target).attr("id") === "update-defense") {
				targetID = parseInt($("#def-presets").find("option:selected").attr("id"));
				faction = "defense";
				name = $("#def-presets").find("option:selected").html();
			} else {
				targetID = parseInt($("#off-presets").find("option:selected").attr("id"));
				faction = "offense";
				name = $("#off-presets").find("option:selected").html();
			}
			if (simulator[faction].update(targetID)) {	
				$("#popup").html("You have successfully updated the preset: " + name).center().fadeIn("fast", function() {
					setTimeout(function() {
						$("#popup").fadeOut("fast")
					}, 1000);
				});
			} else {
				$("#popup").html("You have not saved this deck as a preset before, you will be prompted to save it now.").center().fadeIn("fast", function() {
					setTimeout(function() { 
						$("#popup").fadeOut("fast",
							function() { 
								$("#save-offense").trigger("click");
						})
					}, 2000);
				});
			}
		});
		
		// Let's Begin
		// randomize first card selection, and link chosen cards with the simulator's offense and defense selected cards
		$(".card").each(function() {
			$(this).html(optionList);
			var art, $sel, $opt;
			$sel = $(this).children("option");
			$opt = $sel.eq(Math.floor(Math.random() * $sel.length));
			$opt.prop("selected", true);
			$(this).trigger("change");
		});
	}
	
	// limits selected buffs to 3 buffs and maintains track
	function buffLimiter(toggle, view) {
		var buffs;
		if ($(view).attr("id").charAt(0) === "o") {
			simulator.fixed_ob = (!toggle) ? simulator.fixed_ob-1 : simulator.fixed_ob+1;
			buffs = simulator.fixed_ob;
		} else {
			simulator.fixed_db = (!toggle) ? simulator.fixed_db-1 : simulator.fixed_db+1;
			buffs = simulator.fixed_db;
		}
		if (buffs === 3) {
			$(view).parents(".deck").find("input[type='checkbox']:not(:checked)").prop("disabled", true);
		} else {
			$(view).parents(".deck").find("input[type='checkbox']:not(:checked)").prop("disabled", false);
		}
	}
	
	function comboDetect(sender) {
		var parent;
		if ($(sender).parents("div[id^='oc']").exists()) {
			parent = $(sender).parents("div[id^='oc']");
		} else if ($(sender).parents("div[id^='dc']").exists()) {
			parent = $(sender).parents("div[id^='dc']");
		} else {
			parent = $(sender);
		}
		if (simulator.hasCombo(parent.attr("id"))) {
			parent.parent().parent().find(".combo").html("this deck has potential!");	
		} else {
			parent.parent().parent().find(".combo").html("");
		}
	}
	
	function battleData(results) {
		var offense = results[0];
		var defense = results[1];
		$("#off-wins").html(offense.wins);
		$("#def-losses").html(offense.wins);
		$("#off-percent").html(offense.ratio());
		$("#def-percent").html(defense.ratio());
		$("#def-wins").html(defense.wins);
		$("#off-losses").html(defense.wins);
		$("#off-average").html(offense.average());
		$("#off-mode").html(offense.mode());
		$("#off-max").html(offense.peak);
		$("#off-min").html(offense.valley);
		$("#def-average").html(defense.average());
		$("#def-mode").html(defense.mode());
		$("#def-max").html(defense.peak);
		$("#def-min").html(defense.valley);
		$("#off-none").html(offense.procCount(0));
		$("#off-one").html(offense.procCount(1));
		$("#off-two").html(offense.procCount(2));
		$("#off-three").html(offense.procCount(3));
		$("#def-none").html(defense.procCount(0));
		$("#def-one").html(defense.procCount(1));
		$("#def-two").html(defense.procCount(2));
		$("#def-three").html(defense.procCount(3));
		$("#off-one-freq").html(offense.cardCount("oc1"));
		$("#off-two-freq").html(offense.cardCount("oc2"));
		$("#off-three-freq").html(offense.cardCount("oc3"));
		$("#off-four-freq").html(offense.cardCount("oc4"));
		$("#off-five-freq").html(offense.cardCount("oc5"));
		$("#def-one-freq").html(defense.cardCount("dc1"));
		$("#def-two-freq").html(defense.cardCount("dc2"));
		$("#def-three-freq").html(defense.cardCount("dc3"));
		$("#def-four-freq").html(defense.cardCount("dc4"));
		$("#def-five-freq").html(defense.cardCount("dc5"));
	}	
	
	function battleLog(results) {
		var offense = results[0];
		var defense = results[1];
		var offProcs = results[0].getAbilities();
		var defProcs = results[1].getAbilities();
		var off_log = "";
		var def_log = "";
		
		if (!offense.win) {
			$("#off-result").html("Defeat").removeClass("victory").addClass("defeat");
			$("#def-result").html("Victory").removeClass("defeat").addClass("victory");
		} else {
			$("#off-result").html("Victory").removeClass("defeat").addClass("victory");
			$("#def-result").html("Defeat").removeClass("victory").addClass("defeat");
		}
		
		// Offense Log
		if (offense.adapter) off_log += "<span>Adapter Reaction: <span>"+offense.adapter+"</span></span>";
		if (offense.position) off_log += "<span>Alliance Position Effect: <span>"+offense.position+"</span></span>";
		if (offense.scrapper) off_log += "<span>Scrapper: <span>"+offense.scrapper+"</span></span>";
		for (var i = 0; i < offProcs.length; i++) {
			switch (offProcs[i][2]) {
				case "!Bruiser":
					offProcs[i][2] = "Speed, Tactics"; break;
				case "!Speed":
					offProcs[i][2] = "Bruiser, Tactics"; break;
				case "!Tactics":
					offProcs[i][2] = "Bruiser, Speed"; break;
				default: break;	
			}
			off_log += "<span>"+offProcs[i][0]+((offProcs[i][1]==="Degrade")?" degraded ":" boosted ")+offProcs[i][2]+": <span>"+offProcs[i][3]+"</span></span>";
		}
		if (offense.combo && offense.combo[0] !== "No")
			off_log += "<span>"+offense.combo[0]+((offense.combo[1]==="Degrade")?" degraded ":" boosted ")+offense.combo[3]+": <span>"+offense.combo[2]+"</span></span>"; 	
		off_log += "<span>Total: <span>"+offense.total+"</span></span>";
		
		// Defense Log
		if (defense.adapter) def_log += "<span>Adapter Reaction: <span>"+defense.adapter+"</span></span>";
		if (defense.position) def_log += "<span>Alliance Position Effect: <span>"+defense.position+"</span></span>";		
		for (var j = 0; j < defProcs.length; j++) {
			switch (defProcs[j][2]) {
				case "!Bruiser":
					defProcs[j][2] = "Speed, Tactics"; break;
				case "!Speed":
					defProcs[j][2] = "Bruiser, Tactics"; break;
				case "!Tactics":
					defProcs[j][2] = "Bruiser, Speed"; break;
				default: break;	
			}
			def_log += "<span>"+defProcs[j][0]+((defProcs[j][1]==="Degrade")?" degraded ":" boosted ")+defProcs[j][2] + ": <span>"+defProcs[j][3]+"</span></span>";
		}
		if (defense.combo && defense.combo[0] !== "No") 
			def_log += "<span>"+defense.combo[0]+((defense.combo[1]==="Degrade")?" degraded ":" boosted ")+defense.combo[3]+": <span>"+defense.combo[2]+"</span></span>"; 					
		def_log += "<span>Total: <span>"+defense.total+"</span></span>";
		
		$("#off-log").html(off_log);
		$("#def-log").html(def_log);
	}
});
