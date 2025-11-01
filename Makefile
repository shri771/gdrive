.PHONY: help migrate-up migrate-down migrate-status migrate-create sqlc run build dev install-tools createdb dropdb

include .env
export

help:
	@echo "Available commands:"
	@echo "  make install-tools - Install goose and sqlc"
	@echo "  make createdb      - Create PostgreSQL database"
	@echo "  make dropdb        - Drop PostgreSQL database"
	@echo "  make migrate-up    - Run database migrations"
	@echo "  make migrate-down  - Rollback last migration"
	@echo "  make migrate-status- Check migration status"
	@echo "  make sqlc          - Generate Go code from SQL"
	@echo "  make run           - Run the server"
	@echo "  make build         - Build the binary"
	@echo "  make dev           - Run with hot reload (requires air)"

install-tools:
	@echo "Installing goose..."
	go install github.com/pressly/goose/v3/cmd/goose@latest
	@echo "Installing sqlc..."
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
	@echo "Installing air (optional, for hot reload)..."
	go install github.com/cosmtrek/air@latest
	@echo "Tools installed successfully!"

createdb:
	createdb gdrive || psql -U postgres -c "CREATE DATABASE gdrive;"

dropdb:
	dropdb gdrive || psql -U postgres -c "DROP DATABASE gdrive;"

migrate-up:
	goose -dir sql/schema postgres "$(DATABASE_URL)" up

migrate-down:
	goose -dir sql/schema postgres "$(DATABASE_URL)" down

migrate-status:
	goose -dir sql/schema postgres "$(DATABASE_URL)" status

migrate-create:
	@read -p "Migration name: " name; \
	goose -dir sql/schema create $$name sql

sqlc:
	sqlc generate

run:
	go run cmd/server/main.go

build:
	go build -o bin/gdrive cmd/server/main.go

dev:
	air
