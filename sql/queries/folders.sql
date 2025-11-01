-- name: CreateFolder :one
INSERT INTO folders (name, owner_id, parent_folder_id, is_root)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetFolderByID :one
SELECT * FROM folders WHERE id = $1 AND status = 'active';

-- name: GetSubfolders :many
SELECT * FROM folders
WHERE parent_folder_id = $1 AND status = 'active'
ORDER BY name ASC;

-- name: GetRootFolder :one
SELECT * FROM folders
WHERE owner_id = $1 AND is_root = TRUE
LIMIT 1;

-- name: RenameFolder :exec
UPDATE folders
SET name = $2, updated_at = NOW()
WHERE id = $1;

-- name: TrashFolder :exec
UPDATE folders
SET status = 'trashed', trashed_at = NOW()
WHERE id = $1;

-- name: RestoreFolder :exec
UPDATE folders
SET status = 'active', trashed_at = NULL
WHERE id = $1;

-- name: GetFoldersByOwner :many
SELECT * FROM folders
WHERE owner_id = $1 AND status = 'active'
ORDER BY name ASC;
