<?php 

/* I've replaced these. You will need to put your own values here. */
$db = new PDO('mysql:host=host;dbname=databasename;charset=utf8', 'username', 'password');
$query = $db->query("SELECT * FROM cardstableindatabase ORDER BY cardstableindatabase.id");
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