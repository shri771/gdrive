package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/shri771/gdrive/internal/database"
	"github.com/shri771/gdrive/internal/handlers"
	"github.com/shri771/gdrive/internal/middleware"
	"github.com/shri771/gdrive/internal/services"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Get config from environment
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET is required")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "1030"
	}

	storagePath := os.Getenv("STORAGE_PATH")
	if storagePath == "" {
		storagePath = "storage/uploads"
	}

	thumbnailPath := os.Getenv("THUMBNAIL_PATH")
	if thumbnailPath == "" {
		thumbnailPath = "storage/thumbnails"
	}

	sessionDurationHours, err := strconv.Atoi(os.Getenv("SESSION_DURATION_HOURS"))
	if err != nil {
		sessionDurationHours = 720 // 30 days default
	}

	// Create storage directories
	if err := os.MkdirAll(storagePath, 0755); err != nil {
		log.Fatalf("Failed to create storage directory: %v", err)
	}
	if err := os.MkdirAll(thumbnailPath, 0755); err != nil {
		log.Fatalf("Failed to create thumbnail directory: %v", err)
	}

	// Connect to database
	dbPool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer dbPool.Close()

	// Test database connection
	if err := dbPool.Ping(context.Background()); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("✅ Connected to database")

	// Initialize database queries
	queries := database.New(dbPool)

	// Initialize services
	authService := services.NewAuthService(jwtSecret, sessionDurationHours)
	storageService := services.NewStorageService(storagePath, thumbnailPath)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(queries, authService)
	filesHandler := handlers.NewFilesHandler(queries, storageService)
	foldersHandler := handlers.NewFoldersHandler(queries)
	sharingHandler := handlers.NewSharingHandler(queries, authService)

	// Setup router
	r := chi.NewRouter()

	// Global middleware
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(middleware.CORS) // Enable CORS for React frontend

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	// Public routes (no authentication required)
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", authHandler.Register)
		r.Post("/login", authHandler.Login)
		r.Get("/me", authHandler.Me) // Can work with or without auth
	})

	// Protected routes (authentication required)
	r.Route("/api", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(queries))

		// Auth routes
		r.Post("/auth/logout", authHandler.Logout)

		// File routes
		r.Route("/files", func(r chi.Router) {
			r.Get("/", filesHandler.GetFiles)
			r.Post("/upload", filesHandler.UploadFile)
			r.Get("/recent", filesHandler.GetRecentFiles)
			r.Get("/starred", filesHandler.GetStarredFiles)
			r.Get("/trash", filesHandler.GetTrashedFiles)
			r.Get("/search", filesHandler.SearchFiles)

			r.Route("/{id}", func(r chi.Router) {
				r.Get("/download", filesHandler.DownloadFile)
				r.Get("/thumbnail", filesHandler.GetThumbnail)
				r.Delete("/", filesHandler.DeleteFile)
				r.Post("/restore", filesHandler.RestoreFile)
				r.Post("/star", filesHandler.ToggleStar)
				r.Put("/{id}/rename", filesHandler.RenameFile)
			})
		})

		// Folder routes
		r.Route("/folders", func(r chi.Router) {
			r.Get("/", foldersHandler.GetFolders)
			r.Post("/", foldersHandler.CreateFolder)
			r.Get("/root", foldersHandler.GetRootFolder)
			r.Put("/{id}/rename", foldersHandler.RenameFolder)
		})
	})

	// Start server
	addr := fmt.Sprintf(":%s", port)
	log.Printf("🚀 Server starting on http://localhost%s", addr)
	log.Printf("📁 Storage path: %s", storagePath)
	log.Printf("🔒 CORS enabled for: http://localhost:5173")

	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
