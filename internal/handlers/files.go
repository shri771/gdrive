package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/shri771/gdrive/internal/database"
	"github.com/shri771/gdrive/internal/middleware"
	"github.com/shri771/gdrive/internal/services"
)

type FilesHandler struct {
	queries        *database.Queries
	storageService *services.StorageService
}

func NewFilesHandler(queries *database.Queries, storageService *services.StorageService) *FilesHandler {
	return &FilesHandler{
		queries:        queries,
		storageService: storageService,
	}
}

// UploadFile handles file uploads
func (h *FilesHandler) UploadFile(w http.ResponseWriter, r *http.Request) {
	// Get user from context
	session, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// Parse multipart form (max 500MB)
	if err := r.ParseMultipartForm(500 << 20); err != nil {
		respondWithError(w, http.StatusBadRequest, "failed to parse form")
		return
	}

	// Get file from form
	file, header, err := r.FormFile("file")
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "no file provided")
		return
	}
	defer file.Close()

	// Get folder ID (optional)
	folderIDStr := r.FormValue("folder_id")
	var folderID pgtype.UUID
	if folderIDStr != "" {
		parsedUUID, err := uuid.Parse(folderIDStr)
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "invalid folder_id")
			return
		}
		folderID = pgtype.UUID{Bytes: parsedUUID, Valid: true}
	}

	// Generate file ID
	fileID := uuid.New()

	// Save file to storage
	storagePath, err := h.storageService.SaveFile(
		uuid.UUID(session.UserID.Bytes),
		fileID,
		file,
		header.Filename,
		1, // version 1
	)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, fmt.Sprintf("failed to save file: %v", err))
		return
	}

	// Determine if preview is available (simple check)
	previewAvailable := false
	mimeType := header.Header.Get("Content-Type")
	if mimeType == "application/pdf" || (len(mimeType) >= 6 && mimeType[:6] == "image/") {
		previewAvailable = true
	}

	// Create file record in database
	dbFile, err := h.queries.CreateFile(r.Context(), database.CreateFileParams{
		Name:             header.Filename,
		OriginalName:     header.Filename,
		MimeType:         mimeType,
		Size:             header.Size,
		StoragePath:      storagePath,
		OwnerID:          session.UserID,
		ParentFolderID:   folderID,
		PreviewAvailable: pgtype.Bool{Bool: previewAvailable, Valid: true},
	})
	if err != nil {
		// Cleanup: delete the uploaded file
		h.storageService.DeleteFile(storagePath)
		respondWithError(w, http.StatusInternalServerError, "failed to create file record")
		return
	}

	// Update user storage
	if err := h.queries.UpdateUserStorage(r.Context(), database.UpdateUserStorageParams{
		ID:          session.UserID,
		StorageUsed: pgtype.Int8{Int64: header.Size, Valid: true},
	}); err != nil {
		// Log error but don't fail the request
		fmt.Printf("failed to update storage: %v\n", err)
	}

	// Log activity
	h.queries.LogActivity(r.Context(), database.LogActivityParams{
		UserID:       session.UserID,
		FileID:       dbFile.ID,
		ActivityType: database.ActivityTypeUpload,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dbFile)
}

// GetFiles returns files in a folder or root files
func (h *FilesHandler) GetFiles(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	folderIDStr := r.URL.Query().Get("folder_id")

	var files []database.File
	var err error

	if folderIDStr == "" {
		// Get root files (files with no parent folder)
		files, err = h.queries.GetFilesByFolder(r.Context(), pgtype.UUID{Valid: false})
	} else {
		folderID, err := uuid.Parse(folderIDStr)
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "invalid folder_id")
			return
		}
		files, err = h.queries.GetFilesByFolder(r.Context(), pgtype.UUID{Bytes: folderID, Valid: true})
	}

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to get files")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

// GetRecentFiles returns recently accessed files
func (h *FilesHandler) GetRecentFiles(w http.ResponseWriter, r *http.Request) {
	session, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	files, err := h.queries.GetRecentFiles(r.Context(), database.GetRecentFilesParams{
		OwnerID: session.UserID,
		Limit:   20,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to get recent files")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

// GetStarredFiles returns starred files
func (h *FilesHandler) GetStarredFiles(w http.ResponseWriter, r *http.Request) {
	session, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	files, err := h.queries.GetStarredFiles(r.Context(), session.UserID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to get starred files")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

// GetTrashedFiles returns trashed files
func (h *FilesHandler) GetTrashedFiles(w http.ResponseWriter, r *http.Request) {
	session, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	files, err := h.queries.GetTrashedFiles(r.Context(), session.UserID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to get trashed files")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

// DownloadFile streams a file for download
func (h *FilesHandler) DownloadFile(w http.ResponseWriter, r *http.Request) {
	session, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	fileIDStr := chi.URLParam(r, "id")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid file ID")
		return
	}

	// Get file from database
	dbFile, err := h.queries.GetFileByID(r.Context(), pgtype.UUID{Bytes: fileID, Valid: true})
	if err != nil {
		respondWithError(w, http.StatusNotFound, "file not found")
		return
	}

	// Check ownership
	if dbFile.OwnerID != session.UserID {
		respondWithError(w, http.StatusForbidden, "forbidden")
		return
	}

	// Open file from storage
	file, err := h.storageService.GetFile(dbFile.StoragePath)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to open file")
		return
	}
	defer file.Close()

	// Update last accessed
	h.queries.UpdateLastAccessed(r.Context(), pgtype.UUID{Bytes: fileID, Valid: true})

	// Set headers for download
	w.Header().Set("Content-Type", dbFile.MimeType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", dbFile.Name))
	w.Header().Set("Content-Length", strconv.FormatInt(dbFile.Size, 10))

	// Stream file
	io.Copy(w, file)
}

// DeleteFile moves a file to trash
func (h *FilesHandler) DeleteFile(w http.ResponseWriter, r *http.Request) {
	session, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	fileIDStr := chi.URLParam(r, "id")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid file ID")
		return
	}

	// Get file to check ownership
	dbFile, err := h.queries.GetFileByID(r.Context(), pgtype.UUID{Bytes: fileID, Valid: true})
	if err != nil {
		respondWithError(w, http.StatusNotFound, "file not found")
		return
	}

	if dbFile.OwnerID != session.UserID {
		respondWithError(w, http.StatusForbidden, "forbidden")
		return
	}

	// Move to trash
	if err := h.queries.TrashFile(r.Context(), pgtype.UUID{Bytes: fileID, Valid: true}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to delete file")
		return
	}

	// Log activity
	h.queries.LogActivity(r.Context(), database.LogActivityParams{
		UserID:       session.UserID,
		FileID:       pgtype.UUID{Bytes: fileID, Valid: true},
		ActivityType: database.ActivityTypeDelete,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "file moved to trash",
	})
}

// RestoreFile restores a file from trash
func (h *FilesHandler) RestoreFile(w http.ResponseWriter, r *http.Request) {
	session, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	fileIDStr := chi.URLParam(r, "id")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid file ID")
		return
	}

	// Restore file
	if err := h.queries.RestoreFile(r.Context(), pgtype.UUID{Bytes: fileID, Valid: true}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to restore file")
		return
	}

	// Log activity
	h.queries.LogActivity(r.Context(), database.LogActivityParams{
		UserID:       session.UserID,
		FileID:       pgtype.UUID{Bytes: fileID, Valid: true},
		ActivityType: database.ActivityTypeRestore,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "file restored",
	})
}

// ToggleStar toggles the starred status of a file
func (h *FilesHandler) ToggleStar(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	fileIDStr := chi.URLParam(r, "id")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid file ID")
		return
	}

	// Toggle star
	if err := h.queries.ToggleStarFile(r.Context(), pgtype.UUID{Bytes: fileID, Valid: true}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to toggle star")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "star toggled",
	})
}

// SearchFiles searches files by name
func (h *FilesHandler) SearchFiles(w http.ResponseWriter, r *http.Request) {
	session, _ := middleware.GetUserFromContext(r.Context())

	query := r.URL.Query().Get("q")
	if query == "" {
		respondWithError(w, http.StatusBadRequest, "search query required")
		return
	}

	files, err := h.queries.SearchFilesByName(r.Context(), database.SearchFilesByNameParams{
		OwnerID:        session.UserID,
		PlaintoTsquery: query,
		Limit:          50,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to search files")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

type RenameFileRequest struct {
	NewName string `json:"new_name"`
}

// RenameFile renames a file
func (h *FilesHandler) RenameFile(w http.ResponseWriter, r *http.Request) {
	session, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	fileIDStr := chi.URLParam(r, "id")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid file ID")
		return
	}

	var req RenameFileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.NewName == "" {
		respondWithError(w, http.StatusBadRequest, "new name is required")
		return
	}

	// Get file to check ownership
	dbFile, err := h.queries.GetFileByID(r.Context(), pgtype.UUID{Bytes: fileID, Valid: true})
	if err != nil {
		respondWithError(w, http.StatusNotFound, "file not found")
		return
	}

	if dbFile.OwnerID != session.UserID {
		respondWithError(w, http.StatusForbidden, "forbidden")
		return
	}

	// Rename file in database
	if err := h.queries.RenameFile(r.Context(), database.RenameFileParams{
		ID:   pgtype.UUID{Bytes: fileID, Valid: true},
		Name: req.NewName,
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to rename file")
		return
	}

	// Log activity
	h.queries.LogActivity(r.Context(), database.LogActivityParams{
		UserID:       session.UserID,
		FileID:       pgtype.UUID{Bytes: fileID, Valid: true},
		ActivityType: database.ActivityTypeRename,
		Details:      json.RawMessage(fmt.Sprintf(`{"old_name": "%s", "new_name": "%s"}`, dbFile.Name, req.NewName)),
	})

	respondWithJSON(w, http.StatusOK, map[string]string{
		"message": "file renamed successfully",
	})

}