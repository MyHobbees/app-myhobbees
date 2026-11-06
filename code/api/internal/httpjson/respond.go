// Package httpjson provides small helpers for consistent JSON responses.
package httpjson

import (
	"encoding/json"
	"net/http"
)

// OK writes v as JSON with the given status code (defaults to 200).
func OK(w http.ResponseWriter, status int, v any) {
	if status == 0 {
		status = http.StatusOK
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Error writes a JSON error envelope with the given status code.
func Error(w http.ResponseWriter, status int, message string) {
	OK(w, status, map[string]string{"error": message})
}
