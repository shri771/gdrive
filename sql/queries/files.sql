-- name: CreateFile :one
INSERT INTO files (
    name, original_name, mime_type, size, storage_path,
    owner_id, parent_folder_id, preview_available, thumbnail_path
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetFileByID :one
SELECT * FROM files WHERE id = $1 AND status = 'active';

-- name: GetFileByIDAnyStatus :one
SELECT * FROM files WHERE id = $1;

-- name: GetFilesByFolder :many
SELECT * FROM files
WHERE owner_id = $1
  AND parent_folder_id = $2
  AND status = 'active'
ORDER BY created_at DESC;

-- name: GetRootFiles :many
SELECT * FROM files
WHERE owner_id = $1
  AND parent_folder_id IS NULL
  AND status = 'active'
ORDER BY created_at DESC;

-- name: GetFilesByOwner :many
SELECT * FROM files
WHERE owner_id = $1 AND status = 'active'
ORDER BY updated_at DESC
LIMIT $2 OFFSET $3;

-- name: GetRecentFiles :many
SELECT * FROM files
WHERE owner_id = $1 AND status = 'active'
ORDER BY last_accessed_at DESC NULLS LAST
LIMIT $2;

-- name: GetStarredFiles :many
SELECT * FROM files
WHERE owner_id = $1 AND is_starred = TRUE AND status = 'active'
ORDER BY updated_at DESC;

-- name: GetTrashedFiles :many
SELECT * FROM files
WHERE owner_id = $1 AND status = 'trashed'
ORDER BY trashed_at DESC;

-- name: RenameFile :exec
UPDATE files
SET name = $2, updated_at = NOW()
WHERE id = $1;

-- name: MoveFile :exec
UPDATE files
SET parent_folder_id = $2, updated_at = NOW()
WHERE id = $1;

-- name: TrashFile :exec
UPDATE files
SET status = 'trashed', trashed_at = NOW()
WHERE id = $1;

-- name: RestoreFile :exec
UPDATE files
SET status = 'active', trashed_at = NULL
WHERE id = $1;

-- name: PermanentDeleteFile :exec
UPDATE files
SET status = 'deleted'
WHERE id = $1;

-- name: ToggleStarFile :exec
UPDATE files
SET is_starred = NOT is_starred, updated_at = NOW()
WHERE id = $1;

-- name: UpdateLastAccessed :exec
UPDATE files
SET last_accessed_at = NOW()
WHERE id = $1;

-- name: SearchFilesByName :many
SELECT * FROM files
WHERE owner_id = $1
  AND status = 'active'
  AND to_tsvector('english', name) @@ plainto_tsquery('english', $2)
ORDER BY updated_at DESC
LIMIT $3;

-- name: SearchFilesByType :many
SELECT * FROM files
WHERE owner_id = $1
  AND status = 'active'
  AND mime_type LIKE $2 || '%'
ORDER BY updated_at DESC;
