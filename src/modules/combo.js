/*
    I don't remember if this file is actually used! But, its responsible for deck combos.
 */
define(function() {
	function Combo(name, mod, freq, faction, target, criteria) {
		this.name = name;
		this.mod = mod;
		this.freq = freq;
		this.faction = faction;
		this.target = target;
		this.criteria = criteria;
	}
	
	Combo.prototype = {
        // determine if the combo proc'd
		proc: function() {
			if (Math.ceil(100*(Math.random())) < this.freq) {
				return true;	
			} else {
				return false;
			}
		}
	}

    // These are the combos.
    // Name | Ability | Frequency | Role | Target | Array of cards needed to qualify
    // Ability should be below 1 for degrades (1 - degrade) or above 1 for boosts.
	var combos = [
		new Combo("Modern Weapons", 0.88, 75, "offense", "Hero" ["Sentinal", "Iron Monger", "Ultron"]),
		new Combo("Unlimited Power", 1.1, 75, "offense", "Bruiser", ["Thing", "She-Hulk", "Hulk"]),
		new Combo("Shooting Star", 1.0889, freq, "offense", ["Torch", "Nova", "Surfer"], ["Torch", "Nova", "Surfer"]),
		new Combo("Ogre, Devil, Spider", 1.07, freq, "offense", "Speed", ["Spider-Man", "Ghost Rider", "Blade"]),
		new Combo("The Great Brains", 1.07, freq, "offense", "Tactics", ["Doctor Strange", "Iron Man", "Mr. Fantastic"]),
		new Combo("Wild Villains", 1.03, freq, "offense", "All", {sex: "M", hero: false}),
		new Combo("Dark Powers", 0.97, freq, "offense", "All", {hero: false}),
		new Combo("Avengers Big 3", 1.1191, freq, "offense", ["Captain America", "Iron Man", "Thor"], ["Captain America", "Iron Man", "Thor"]),
		new Combo("Biker's Organization", 1.07, freq, "offense", ["Ghost Rider", "Torch", "Wolverine"], ["Ghost Rider", "Torch", "Wolverine"]),
		new Combo("Synergy Drive Reactors", 1.122, freq, "offense", ["Iron Man", "War Machine"], ["Iron Man", "War Machine"]),
		new Combo("Merciless Heroes", 1.1215, freq, "offense", ["Punisher", "Wolverine"], ["Punisher", "Wolverine"]),
		new combo("Super Soldiers", 1.1191, freq, "offense", ["Captain America", "Wolverine"], ["Captain America", "Wolverine"]),
		new Combo("Dangerous Beauties", 0.96, 90, "offense", "All", {sex: "F", hero: true}),
		new Combo("Fury Blast", 1.03, 90, "offense", "All", {sex: "M", hero: true}),
		new Combo("Fantastic Four", 1.1, freq, ["Thing", "Mr. Fantastic", "Torch", "Invisible"], ["Thing", "Mr. Fantastic", "Torch", "Invisible"]),
		new Combo("Marvel Hero Team", 1.03, 80, "All", {hero: true})
	];
	
	return {
        // Determine if this deck qualifies for a combo.
		qualify: function (deck) {
			var faction = deck[0].faction, qualify = true, matched = false, criteria;
			for (var c = 0; c < combos.length; c++) {
				criteria = combos[c].criteria;
				if (combos[c].faction !== faction)
					continue;
				if (criteria.length) {
					for (var cr = 0; cr < criteria.length; cr++) {
						for (var ca = 0; ca < deck.length; ca++) {
							if (deck[ca].data.name.match(criteria[cr])) {
								matched = true;
							}
						}
						if (!matched) 
							qualify = false;
					}
					if (qualify)
						return combos[c];
				} else if (criteria.sex && criteria.hero) {
					for (var ca = 0; ca < deck.length; ca++) {
						if (deck[ca].data.sex != criteria.sex || deck[ca].data.hero !== criteria.hero) {
							qualify = false;
							break;
						}
					}
					if (qualify) 
						return combos[c];
				} else if (criteria.hero) {
					for (var ca = 0; ca < deck.length; ca++) {
						if (deck[ca].data.hero !== criteria.hero) {
							qualify = false;
							break;
						}
					}
					if (qualify)
						return combos[c];
				} else {
					return false;	
				}
			}
		}
	}
	
	
});
/*

				
				} else if (this.qualify("name", ["Wolverine", "Punisher"])) {
					finalCombo = ["Merciless Heroes", 1.1215, ["Punisher", "Wolverine"]];
				} else if (this.qualify("name", ["Captain America", "Wolverine"])) {
					finalCombo = ["Super Soldiers", 1.1191, ["Captain America", "Wolverine"]];
				} else if (this.qualify("sex", "F") && this.qualify("hero", "1")) {
					finalCombo = ["Alluring Heroes", 0.97, "Villain"];	
				} else if (this.qualify("sex", "M") && this.qualify("hero", "1")) {
					finalCombo = ["Fury Blast", 1.03, "Team"];
				} else {
					finalCombo = ["No", 1, "Team"];
				}	
			} else {
				if (this.qualify("name", ["Thing", "Mr. Fantastic", "Torch", "Invisible"])) {
					finalCombo = ["Fantastic Four", 1.1, ["Thing", "Mr. Fantastic", "Torch", "Invisible"]];
				} else if (this.qualify("hero", "1")) {
					finalCombo = ["Marvel Hero Team", 1.03, "Team"];
				} else {
					finalCombo = ["No", 1, "Team"];
				}
			}
			return finalCombo;
			
			comboProc: function() {
			var proc = false, combo;
			combo = this.combo();
			switch (combo) {
				case "Ogre, Devil, Spider":
				case "Shooting Star":
				case "Avengers Big 3":
				case "Great Brains":
				case "Unlimited Power":
				case "Modern Weapons":
					if (Math.ceil(4*(Math.random())) > 1) {
						proc = true;	
					}
					break;
				case "Fury Blast":
				case "Alluring Heroes":
				case "Wild Villains":
					if (Math.ceil(10*(Math.random())) > 1) {
						proc = true;
					}
					break;
				case "Marvel Hero Team":
				case "Dark Powers":
				case "Fantastic Four":
				case "Defenders":
					if (Math.ceil(10*(Math.random())) > 2) {
						proc = true;	
					}
					break;
				case "Super Soldiers":
				case "Merciless Heroes":
				case "Synergy Drive Reactors":
					if (Math.ceil(10*(Math.random())) > 4 || is_fixed) {
						proc = true;
					}
			}
			return proc;*/