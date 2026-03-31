<?php
declare(strict_types=1);

/**
 * Export WordPress (read-only) → JSON for the Vite app in web/src/data.
 *
 * From repo root:
 *   C:\xampp\php\php.exe scripts\export-wp-to-json.php
 */

$repoRoot = dirname(__DIR__);
$outDir   = $repoRoot . DIRECTORY_SEPARATOR . 'web' . DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR . 'data';

$dbHost = getenv('WP_EXPORT_DB_HOST') ?: '127.0.0.1';
$dbUser = getenv('WP_EXPORT_DB_USER') ?: 'root';
$dbPass = getenv('WP_EXPORT_DB_PASS') ?: '';
$dbName = getenv('WP_EXPORT_DB_NAME') ?: 'ruigato_wp';
$prefix = getenv('WP_EXPORT_TABLE_PREFIX') ?: 'TtXh0s_';

$m = mysqli_connect($dbHost, $dbUser, $dbPass, $dbName);
if (!$m) {
	fwrite(STDERR, 'mysqli_connect failed: ' . mysqli_connect_error() . PHP_EOL);
	exit(1);
}
mysqli_set_charset($m, 'utf8mb4');

$postsTable  = $prefix . 'posts';
$postmetaTable = $prefix . 'postmeta';
$trTable    = $prefix . 'term_relationships';
$ttTable    = $prefix . 'term_taxonomy';
$termsTable = $prefix . 'terms';

function taxonomy_names(mysqli $m, string $trTable, string $ttTable, string $termsTable, int $postId, string $taxonomy): array {
	$sql = "SELECT t.name FROM {$termsTable} t
		INNER JOIN {$ttTable} tt ON tt.term_id = t.term_id
		INNER JOIN {$trTable} tr ON tr.term_taxonomy_id = tt.term_taxonomy_id
		WHERE tr.object_id = ? AND tt.taxonomy = ?
		ORDER BY t.name ASC";
	$st = mysqli_prepare($m, $sql);
	if (!$st) {
		return array();
	}
	mysqli_stmt_bind_param($st, 'is', $postId, $taxonomy);
	mysqli_stmt_execute($st);
	$res = mysqli_stmt_get_result($st);
	$out = array();
	while ($row = mysqli_fetch_row($res)) {
		$out[] = $row[0];
	}
	return $out;
}

/**
 * @return array<int, array{guid: string, attachmentId: int}> post_id => dados do attachment em destaque
 */
function featured_data_for_posts(mysqli $m, string $postsTable, string $postmetaTable, array $postIds): array {
	$postIds = array_values(array_filter(array_map('intval', $postIds)));
	if (count($postIds) === 0) {
		return array();
	}
	$in = implode(',', $postIds);
	$sql = "SELECT post_id, meta_value FROM {$postmetaTable}
		WHERE meta_key = '_thumbnail_id' AND post_id IN ({$in})";
	$res = mysqli_query($m, $sql);
	if (!$res) {
		return array();
	}
	$thumbByPost = array();
	while ($row = mysqli_fetch_assoc($res)) {
		$pid = (int) $row['post_id'];
		$aid = (int) $row['meta_value'];
		if ($aid > 0) {
			$thumbByPost[$pid] = $aid;
		}
	}
	if (count($thumbByPost) === 0) {
		return array();
	}
	$attIds = array_values(array_unique(array_values($thumbByPost)));
	$inA = implode(',', $attIds);
	$sql2 = "SELECT ID, guid FROM {$postsTable}
		WHERE post_type = 'attachment' AND ID IN ({$inA})";
	$res2 = mysqli_query($m, $sql2);
	if (!$res2) {
		return array();
	}
	$guidByAtt = array();
	while ($row = mysqli_fetch_assoc($res2)) {
		$guidByAtt[(int) $row['ID']] = $row['guid'];
	}
	$out = array();
	foreach ($thumbByPost as $postId => $attId) {
		if (!empty($guidByAtt[$attId])) {
			$out[$postId] = array(
				'guid'         => $guidByAtt[$attId],
				'attachmentId' => $attId,
			);
		}
	}
	return $out;
}

/**
 * @return array<int, array<string, mixed>|null> attachment_id => meta unserializada ou null
 */
function attachment_metadata_map(mysqli $m, string $postmetaTable, array $attachmentIds): array {
	$attachmentIds = array_values(array_unique(array_filter(array_map('intval', $attachmentIds))));
	if (count($attachmentIds) === 0) {
		return array();
	}
	$in = implode(',', $attachmentIds);
	$sql = "SELECT post_id, meta_value FROM {$postmetaTable}
		WHERE meta_key = '_wp_attachment_metadata' AND post_id IN ({$in})";
	$res = mysqli_query($m, $sql);
	if (!$res) {
		return array();
	}
	$out = array();
	while ($row = mysqli_fetch_assoc($res)) {
		$pid = (int) $row['post_id'];
		$raw = $row['meta_value'];
		$data = @unserialize($raw, array('allowed_classes' => false));
		$out[$pid] = is_array($data) ? $data : null;
	}
	return $out;
}

/** URL de tamanho reduzido (medium_large > medium > thumbnail) para a grelha. */
function pick_sized_thumb_url(string $guid, ?array $meta): ?string {
	if ($meta === null || !isset($meta['sizes']) || !is_array($meta['sizes'])) {
		return null;
	}
	$sizes = $meta['sizes'];
	$rel = null;
	foreach (array('medium_large', 'medium', 'thumbnail') as $name) {
		if (!empty($sizes[$name]['file'])) {
			$rel = $sizes[$name]['file'];
			break;
		}
	}
	if ($rel === null) {
		return null;
	}
	return dirname($guid) . '/' . $rel;
}

function fetch_posts(mysqli $m, string $postsTable, string $type): array {
	$sql = "SELECT ID, post_name, post_title, post_date, post_excerpt, post_content
		FROM {$postsTable}
		WHERE post_type = ? AND post_status = 'publish'
		ORDER BY post_date DESC";
	$st = mysqli_prepare($m, $sql);
	mysqli_stmt_bind_param($st, 's', $type);
	mysqli_stmt_execute($st);
	$res = mysqli_stmt_get_result($st);
	$rows = array();
	while ($row = mysqli_fetch_assoc($res)) {
		$rows[] = $row;
	}
	return $rows;
}

$rawPosts = fetch_posts($m, $postsTable, 'post');
$postIds = array();
foreach ($rawPosts as $row) {
	$postIds[] = (int) $row['ID'];
}
$featuredByPost = featured_data_for_posts($m, $postsTable, $postmetaTable, $postIds);
$attIdsMeta = array();
foreach ($featuredByPost as $fd) {
	$attIdsMeta[] = $fd['attachmentId'];
}
$metaByAttachment = attachment_metadata_map($m, $postmetaTable, $attIdsMeta);

$works = array();
foreach ($rawPosts as $row) {
	$id   = (int) $row['ID'];
	$slug = $row['post_name'];
	if ($slug === '') {
		continue;
	}
	$date = substr($row['post_date'], 0, 10);
	$tags = taxonomy_names($m, $trTable, $ttTable, $termsTable, $id, 'post_tag');
	$cats = taxonomy_names($m, $trTable, $ttTable, $termsTable, $id, 'category');
	$featFull = null;
	$featThumb = null;
	if (isset($featuredByPost[$id])) {
		$featFull = $featuredByPost[$id]['guid'];
		$aid = $featuredByPost[$id]['attachmentId'];
		$meta = isset($metaByAttachment[$aid]) ? $metaByAttachment[$aid] : null;
		$featThumb = pick_sized_thumb_url($featFull, $meta);
	}

	$works[] = array(
		'slug'                => $slug,
		'title'               => $row['post_title'],
		'date'                => $date,
		'summary'             => $row['post_excerpt'] !== '' ? $row['post_excerpt'] : null,
		'bodyHtml'            => $row['post_content'],
		'tags'                => count($tags) ? $tags : null,
		'categories'          => count($cats) ? $cats : null,
		'wpId'                => $id,
		'featuredImage'       => $featFull,
		'featuredImageThumb'  => $featThumb,
	);
}

$rawPages = fetch_posts($m, $postsTable, 'page');
$pages    = array();
foreach ($rawPages as $row) {
	$slug = $row['post_name'];
	if ($slug === '') {
		continue;
	}
	$pages[] = array(
		'slug'     => $slug,
		'title'    => $row['post_title'],
		'excerpt'  => $row['post_excerpt'] !== '' ? $row['post_excerpt'] : null,
		'bodyHtml' => $row['post_content'],
		'wpId'     => (int) $row['ID'],
	);
}

$timeline = array();
foreach ($works as $w) {
	$ts = strtotime($w['date'] ?? '');
	if ($ts === false) {
		continue;
	}
	$timeline[] = array(
		'id'       => (string) $w['wpId'],
		'label'    => $w['title'],
		'year'     => (int) gmdate('Y', $ts),
		'month'    => (int) gmdate('n', $ts),
		'workSlug' => $w['slug'],
	);
}

if (!is_dir($outDir)) {
	mkdir($outDir, 0777, true);
}

$flags = JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT;
file_put_contents($outDir . DIRECTORY_SEPARATOR . 'works.json', json_encode($works, $flags) . "\n");
file_put_contents($outDir . DIRECTORY_SEPARATOR . 'pages.json', json_encode(array( 'pages' => $pages ), $flags) . "\n");
file_put_contents($outDir . DIRECTORY_SEPARATOR . 'timeline-events.json', json_encode($timeline, $flags) . "\n");

echo 'Exported ' . count($works) . ' works, ' . count($pages) . ' pages, ' . count($timeline) . ' timeline points -> ' . $outDir . PHP_EOL;