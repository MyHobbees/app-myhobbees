GOOS   := linux
GOARCH := arm64
DIST   := dist

.PHONY: all build zip clean tidy test vet

all: zip

tidy:
	go mod tidy

test:
	go test ./...

vet:
	go vet ./...

build:
	@mkdir -p $(DIST)
	GOOS=$(GOOS) GOARCH=$(GOARCH) CGO_ENABLED=0 \
		go build -tags lambda.norpc -o $(DIST)/bootstrap ./cmd/api

zip: build
	cd $(DIST) && zip -q -X api.zip bootstrap

clean:
	rm -rf $(DIST)
