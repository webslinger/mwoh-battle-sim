<?php 

//$db = new PDO('mysql:host=localhost;dbname=thestrat_cards;charset=utf8', 'thestrat_weapon', '294226wpDb');
$query = $db->query("SELECT * FROM thestrat_cards.all ORDER BY thestrat_cards.all.Name");
$results = $query->fetchAll(PDO::FETCH_ASSOC);
#$results = json_encode($results);

$newResults = array();

foreach ($results as $result) {
  	array_push($newResults, reconfigure($result));
}

/*
$insert->bindParam(':rarity', $rarity);
$insert->bindParam(':alignment', $alignment);
$insert->bindParam(':pwr', $pwr);
$insert->bindParam(':sex', $sex);
$insert->bindParam(':hero', $hero);
$insert->bindParam(':name', $name);
$insert->bindParam(':atk', $atk);
$insert->bindParam(':def', $def);
$insert->bindParam(':ability', $ability);
$insert->bindParam(':modifier', $mod);
$insert->bindParam(':scope', $scope);
$insert->bindParam(':type', $type);
$insert->bindParam(':target', $target);
$insert->bindParam(':frequency', $freq);
*/
	
foreach ($newResults as $newResult) {
	$rarity = $newResult['rarity'];
	$alignment = $newResult['alignment'];
	$pwr = $newResult['pwr'];
	$sex = $newResult['sex'];
	$hero = $newResult['hero'];
	$name = $newResult['name'];
	$name = str_replace("'","''",$name);
	$atk = $newResult['atk'];
	$def = $newResult['def'];
	$ability = $newResult['ability'];
	$modifier = $newResult['mod'];
	$scope = $newResult['scope'];
	$type = $newResult['type'];
	$target = $newResult['target'];
	$frequency = $newResult['freq'];
	
	$insert = $db->prepare("INSERT INTO thestrat_cards.catalogue (rarity, alignment, pwr, sex, hero, name, atk, def, ability, modifier, scope, type, target, frequency) VALUES ('{$rarity}', '{$alignment}', '{$pwr}', '{$sex}', '{$hero}', '{$name}', '{$atk}', '{$def}', '{$ability}', '{$modifier}', '{$scope}', '{$type}', '{$target}', '{$frequency}')");
	$insert->execute();
	if ($insert->errorCode() !== "00000") {
		var_dump($insert->errorInfo());
	}
}

function reconfigure($input) {
	$tier = $input['Tier'];
	$conf = "";
	$ability;
	$mod;
	$target;
	$freq;
	$alignment = $input['Alignment'];
	$rarity = $input['Rarity'];
	$name = $input['Name'];
	$scope = $input['Affects'];
	$atk = $input['ATK'];
	$def = $input['DEF'];
	$sex = $input['Sex'];
	$hero = ($input['Hero']) ? true : false;
	$pwr = $input['PWR'];
	
	$conf .= $tier[0];
	$conf .= ($input['Affects'] === "ATKDEF") ? "T" : "O";
	$conf .= $input['Target'][0];
	
	switch ($conf) {
		case "PTA": $ability = 2; break;
		case "POA": case "PTO": $ability = 3; break;
		case "POO": case "NTA": $ability = 4; break;
		case "NOA": case "NTO": case "RTA": $ability = 6; break;
		case "NOO":	case "ROA": case "RTO": case "STA": $ability = 9; break;
		case "PTS": $ability = 10; break;
		case "POS": case "ROO": case "SOA": case "STO": case "ETA": $ability = 12; break;
		case "SOO": case "EOA": case "ETO": $ability = 16; break;
		case "NTS": case "EOO": $ability = 20; break;
		case "NOS": $ability = 24; break;
		case "RTS": $ability = 28; break;
		case "ROS": $ability = 38; break;
		case "STS": $ability = 38; break;
		case "SOS": $ability = 48; break;
		case "ETS": $ability = 48; break;
		case "EOS": $ability = 58; break;
		default: $ability = 0; break;
	}
		
	switch ($conf) {
		case "EOO": $mod = 1; break;
		case "SOO": $mod = 0.9; break;
		case "EOA": case "ETO": case "ETA": case "STO": case "SOA": case "ROO": $mod = 0.8; break;
		case "STA": case "RTO": case "ROA": $mod = 0.7; break;
		case "RTA": $mod = 0.5; break;
		case "NOO": case "POO": $mod = 0.4; break;
		case "NTO": case "NOA": case "NTA": case "POA": case "PTO": $mod = 0.3; break;
		case "PTA": $mod = 0.2; break;
		case "EOS": $mod = 3.2; break;
		case "ETS": case "STS": case "ROS": $mod = 2.4; break;
		case "SOS": $mod = 2.7; break;
		case "RTS": $mod = 2.1; break;
		case "NOS": case "PTS": $mod = 0.9; break;
		case "POS": $mod = 1.2; break;
	}
	
	switch ($input['Freq']) {
		case "Very Low": $freq = 15; break;
		case "Low": $freq = 25; break;
		case "Relatively Low": $freq = 33.3; break;
		case "Average": $freq = 50; break;
		case "Relatively High": $freq = 66.6; break;
		case "High": $freq = 75; break;
		default: $freq = 0; break;
	}
	
	switch ($input['Target'][0]) {
		case "A": $target = "All"; break;
		case "O": $target = $alignment; break;
		case "S": $target = "Self"; break;
		default: $target = "None"; break;
	}
	
	if ($output['Type'] === "Deg") {
		$type = "Degrade";	
		if ($target === $alignment) {
			switch ($alignment) {
				case "Bruiser": $target = "Tactics"; break;
				case "Speed": $target = "Bruiser"; break;
				case "Tactics": $target = "Speed"; break;	
			}
		}
	} else {
		$type = "Boost";
	}
	
	$returnResult = array(
		'ability' => $ability,
		'pwr' => $pwr,
		"mod" => $mod,
		"target" => $target,
		"freq" => $freq,
		"alignment" => $alignment,
		"rarity" => $rarity,
		"name" => $name,
		"scope" => $scope,
		"atk" => $atk,
		"def" => $def,
		"sex" => $sex,
		"hero" => $hero,
		"type" => $type
	);
	
}
?>