package main

import (
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"
)

type Gateway struct {
	routes map[string]*httputil.ReverseProxy
}

func NewGateway() *Gateway {
	return &Gateway{
		routes: make(map[string]*httputil.ReverseProxy),
	}
}

func (g *Gateway) AddRoute(path, target string) error {
	targetURL, err := url.Parse(target)
	if err != nil {
		return fmt.Errorf("invalid target URL %s: %v", target, err)
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)
	
	proxy.ModifyResponse = func(resp *http.Response) error {
		resp.Header.Set("X-Gateway", "api-gateway")
		return nil
	}

	g.routes[path] = proxy
	return nil
}

func (g *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	start := time.Now()
	defer func() {
		log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
	}()

	for path, proxy := range g.routes {
		if strings.HasPrefix(r.URL.Path, path) {
			r.URL.Path = strings.TrimPrefix(r.URL.Path, path)
			if r.URL.Path == "" {
				r.URL.Path = "/"
			}
			proxy.ServeHTTP(w, r)
			return
		}
	}

	http.NotFound(w, r)
}

func main() {
	gateway := NewGateway()

	gateway.AddRoute("/api/v1/users", "http://localhost:3001")
	gateway.AddRoute("/api/v1/orders", "http://localhost:3002")
	gateway.AddRoute("/api/v1/products", "http://localhost:3003")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      gateway,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("API Gateway starting on port %s", port)
	log.Printf("Routes configured:")
	for path := range gateway.routes {
		log.Printf("  %s -> backend service", path)
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}