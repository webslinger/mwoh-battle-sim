<?php 

$db = new PDO('mysql:host=localhost;dbname=thestrat_cards;charset=utf8', 'thestrat_weapon', '294226MWoH');
$query = $db->query("SELECT * FROM thestrat_cards.catalogue ORDER BY thestrat_cards.catalogue.id");
$results = $query->fetchAll(PDO::FETCH_ASSOC);

$newResults = array();

uasort($results, function($a, $b) {
	$card1 = $a['name'];
	$card2 = $b['name'];
	$card1 = ($card1[0] === "[") ? substr($card1, strpos($card1, "]")+2) : $card1;
	$card2 = ($card2[0] === "[") ? substr($card2, strpos($card2, "]")+2) : $card2;
	$card1 = str_replace("+","",$card1);
	$card2 = str_replace("+","",$card2);
	if ($card1 === $card2) {
		$card1 = substr($a['name'],0,strpos($card1,"]"));
		$card2 = substr($b['name'],0,strpos($card2,"]"));
		if ($card1 === $card2) {
			$card1 = $a['name']; $card2 = $b['name'];
			if ($card1 === $card2) {
				return 0;
			}
		}
	}
	return ($card1 > $card2) ? 1 : -1;
});

foreach ($results as $result) {
	array_push($newResults, $result);
}

echo json_encode($newResults);

?>