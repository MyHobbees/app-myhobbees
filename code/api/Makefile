# Build the Go Lambdas as `bootstrap` binaries zipped for the provided.al2023
# runtime (arm64). deploy.api.py performs the same steps in CI.

LAMBDAS := health example authorizer
GOOS    := linux
GOARCH  := arm64
DIST    := dist

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
	@for l in $(LAMBDAS); do \
		echo "building $$l"; \
		GOOS=$(GOOS) GOARCH=$(GOARCH) CGO_ENABLED=0 \
			go build -tags lambda.norpc -o $(DIST)/$$l/bootstrap ./cmd/$$l; \
	done

zip: build
	@for l in $(LAMBDAS); do \
		(cd $(DIST)/$$l && zip -q -X $$l.zip bootstrap); \
		echo "packaged $(DIST)/$$l/$$l.zip"; \
	done

clean:
	rm -rf $(DIST)
