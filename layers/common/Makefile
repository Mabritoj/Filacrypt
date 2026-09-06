build-CommonLayer:
	mkdir -p "$(ARTIFACTS_DIR)/nodejs/node_modules/logger"
	npx esbuild src/logger/index.ts --bundle --platform=node --format=esm \
	  --outfile="$(ARTIFACTS_DIR)/nodejs/node_modules/logger/index.js"
	cp src/logger/package.json "$(ARTIFACTS_DIR)/nodejs/node_modules/logger/package.json"
	mkdir -p "$(ARTIFACTS_DIR)/nodejs/node_modules/env-config"
	npx esbuild src/config/index.ts --bundle --platform=node --format=esm \
	  --outfile="$(ARTIFACTS_DIR)/nodejs/node_modules/env-config/index.js"
	cp src/config/package.json "$(ARTIFACTS_DIR)/nodejs/node_modules/env-config/package.json"
	mkdir -p "$(ARTIFACTS_DIR)/nodejs/node_modules/workspace-auth"
	npx esbuild src/workspace-auth/index.ts --bundle --platform=node --format=esm \
	  --external:env-config \
	  --banner:js='import { createRequire } from "module"; import { fileURLToPath } from "url"; import { dirname } from "path"; const require = createRequire(import.meta.url); const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);' \
	  --outfile="$(ARTIFACTS_DIR)/nodejs/node_modules/workspace-auth/index.js"
	cp src/workspace-auth/package.json "$(ARTIFACTS_DIR)/nodejs/node_modules/workspace-auth/package.json"
	mkdir -p "$(ARTIFACTS_DIR)/nodejs/node_modules/dynamo-utils"
	npx esbuild src/dynamo-utils/index.ts --bundle --platform=node --format=esm \
	  --banner:js='import { createRequire } from "module"; import { fileURLToPath } from "url"; import { dirname } from "path"; const require = createRequire(import.meta.url); const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);' \
	  --outfile="$(ARTIFACTS_DIR)/nodejs/node_modules/dynamo-utils/index.js"
	cp src/dynamo-utils/package.json "$(ARTIFACTS_DIR)/nodejs/node_modules/dynamo-utils/package.json"
	mkdir -p "$(ARTIFACTS_DIR)/nodejs/node_modules/http-responses"
	npx esbuild src/http-responses/index.ts --bundle --platform=node --format=esm \
	  --outfile="$(ARTIFACTS_DIR)/nodejs/node_modules/http-responses/index.js"
	cp src/http-responses/package.json "$(ARTIFACTS_DIR)/nodejs/node_modules/http-responses/package.json"
	mkdir -p "$(ARTIFACTS_DIR)/nodejs/node_modules/event-utils"
	npx esbuild src/event-utils/index.ts --bundle --platform=node --format=esm \
	  --outfile="$(ARTIFACTS_DIR)/nodejs/node_modules/event-utils/index.js"
	cp src/event-utils/package.json "$(ARTIFACTS_DIR)/nodejs/node_modules/event-utils/package.json"
