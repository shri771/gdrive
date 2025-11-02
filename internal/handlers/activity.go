package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/shri771/gdrive/internal/database"
	"github.com/shri771/gdrive/internal/middleware"
)

type ActivityHandler struct {
	queries *database.Queries
}

func NewActivityHandler(queries *database.Queries) *ActivityHandler {
	return &ActivityHandler{
		queries: queries,
	}
}

// GetUserActivity returns the user's recent activity
func (h *ActivityHandler) GetUserActivity(w http.ResponseWriter, r *http.Request) {
	session, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// Get limit from query params, default to 50
	limitStr := r.URL.Query().Get("limit")
	limit := int32(50)
	if limitStr != "" {
		parsedLimit, err := strconv.Atoi(limitStr)
		if err == nil && parsedLimit > 0 && parsedLimit <= 200 {
			limit = int32(parsedLimit)
		}
	}

	// Get user activity
	activities, err := h.queries.GetUserActivity(r.Context(), database.GetUserActivityParams{
		UserID: session.UserID,
		Limit:  limit,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to get activity")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(activities)
}

// GetFileActivity returns activity for a specific file
func (h *ActivityHandler) GetFileActivity(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	fileIDStr := r.URL.Query().Get("file_id")
	if fileIDStr == "" {
		respondWithError(w, http.StatusBadRequest, "file_id is required")
		return
	}

	parsedUUID, err := uuid.Parse(fileIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "invalid file_id")
		return
	}

	// Get limit from query params, default to 20
	limitStr := r.URL.Query().Get("limit")
	limit := int32(20)
	if limitStr != "" {
		parsedLimit, err := strconv.Atoi(limitStr)
		if err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = int32(parsedLimit)
		}
	}

	// Get file activity
	activities, err := h.queries.GetFileActivity(r.Context(), database.GetFileActivityParams{
		FileID: pgtype.UUID{Bytes: parsedUUID, Valid: true},
		Limit:  limit,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "failed to get file activity")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(activities)
}
