package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"

	"github.com/myhobbees/api/internal/app"
)

func main() {
	if err := godotenv.Load(); err == nil {
		log.Println("Loaded .env file")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	log.Printf("API listening on http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, app.New()); err != nil {
		log.Fatal(err)
	}
}
