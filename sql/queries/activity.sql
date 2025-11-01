-- name: LogActivity :exec
INSERT INTO activity_log (user_id, file_id, activity_type, details)
VALUES ($1, $2, $3, $4);

-- name: GetUserActivity :many
SELECT al.*, f.name as file_name
FROM activity_log al
LEFT JOIN files f ON al.file_id = f.id
WHERE al.user_id = $1
ORDER BY al.created_at DESC
LIMIT $2;

-- name: GetFileActivity :many
SELECT al.*, u.name as user_name
FROM activity_log al
JOIN users u ON al.user_id = u.id
WHERE al.file_id = $1
ORDER BY al.created_at DESC
LIMIT $2;
